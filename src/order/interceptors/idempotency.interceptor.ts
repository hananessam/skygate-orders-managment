import {
  BadRequestException,
  CallHandler,
  ConflictException,
  Inject,
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { isUUID } from 'class-validator';
import type { Redis } from 'ioredis';
import { Observable, firstValueFrom, from } from 'rxjs';
import { REDIS_CLIENT } from '../../common/redis/redis.constants';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

type IdempotencyCachedResponse = {
  status: 'completed';
  body: unknown;
};

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const idempotencyKey = this.getIdempotencyKey(request);
    if (!idempotencyKey) {
      return next.handle();
    }

    if (!isUUID(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID');
    }

    const userId = request.user.id;
    const redisKey = this.getRedisKey(userId, idempotencyKey);

    return from(this.handleIdempotentRequest(redisKey, response, next));
  }

  private async handleIdempotentRequest(
    redisKey: string,
    response: Response,
    next: CallHandler,
  ): Promise<unknown> {
    const claimResult = await this.redis.set(
      redisKey,
      'processing',
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
      'NX',
    );

    if (claimResult === 'OK') {
      return this.executeAndCacheResponse(redisKey, next);
    }

    return this.resolveCachedResponse(redisKey, response);
  }

  private async executeAndCacheResponse(
    redisKey: string,
    next: CallHandler,
  ): Promise<unknown> {
    try {
      const body = await firstValueFrom(next.handle());
      await this.redis.set(
        redisKey,
        JSON.stringify({ status: 'completed', body } satisfies IdempotencyCachedResponse),
        'KEEPTTL',
      );
      return body;
    } catch (error) {
      await this.redis.del(redisKey);
      throw error;
    }
  }

  private async resolveCachedResponse(
    redisKey: string,
    response: Response,
  ): Promise<unknown> {
    const rawStoredValue = await this.redis.get(redisKey);

    if (!rawStoredValue || rawStoredValue === 'processing') {
      throw new ConflictException(
        'A request with this Idempotency-Key is already being processed',
      );
    }

    const storedValue = this.parseStoredValue(rawStoredValue);
    if (!storedValue) {
      throw new ConflictException(
        'A request with this Idempotency-Key is already being processed',
      );
    }

    response.status(201);
    return storedValue.body;
  }

  private getIdempotencyKey(request: Request): string | undefined {
    const headerValue = request.headers['idempotency-key'];

    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  private getRedisKey(userId: number, idempotencyKey: string): string {
    return `idempotency:${userId}:${idempotencyKey}`;
  }

  private parseStoredValue(rawStoredValue: string): IdempotencyCachedResponse | null {
    try {
      const parsed = JSON.parse(rawStoredValue) as Partial<IdempotencyCachedResponse>;
      if (parsed.status === 'completed') {
        return {
          status: 'completed',
          body: parsed.body,
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}
