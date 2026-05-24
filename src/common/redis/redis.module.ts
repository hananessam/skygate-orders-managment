import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import redisConfig from '../../config/redis.config';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<ConfigType<typeof redisConfig>>('redis');

        return new Redis({
          host: redis?.host ?? '127.0.0.1',
          port: redis?.port ?? 6379,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
