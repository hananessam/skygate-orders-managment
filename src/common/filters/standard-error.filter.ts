import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

type StandardErrorResponse = {
  success: false;
  message: string;
  error: {
    code: string;
    details: unknown;
  };
};

@Catch()
export class StandardErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const normalizedError = this.normalizeException(exception);

    response.status(normalizedError.status).json({
      success: false,
      message: normalizedError.message,
      error: {
        code: normalizedError.code,
        details: normalizedError.details,
      },
    } satisfies StandardErrorResponse);
  }

  private normalizeException(exception: unknown): {
    status: number;
    message: string;
    code: string;
    details: unknown;
  } {
    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    let details: { message: string } | null = null;
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      details = { message: exception.message };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: this.statusToErrorCode(HttpStatus.INTERNAL_SERVER_ERROR),
      details,
    };
  }

  private normalizeHttpException(exception: HttpException): {
    status: number;
    message: string;
    code: string;
    details: unknown;
  } {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        status,
        message: exceptionResponse,
        code: this.statusToErrorCode(status),
        details: null,
      };
    }

    if (this.isRecord(exceptionResponse)) {
      const responseCode =
        typeof exceptionResponse.code === 'string'
          ? exceptionResponse.code
          : this.statusToErrorCode(status);

      const responseMessage = this.resolveMessage(exceptionResponse.message, status);
      const responseDetails = this.resolveDetails(exceptionResponse);

      return {
        status,
        message: responseMessage,
        code: responseCode,
        details: responseDetails,
      };
    }

    return {
      status,
      message: this.defaultMessageForStatus(status),
      code: this.statusToErrorCode(status),
      details: null,
    };
  }

  private resolveMessage(message: unknown, status: number): string {
    if (Array.isArray(message)) {
      return status === HttpStatus.BAD_REQUEST
        ? 'Validation failed'
        : this.defaultMessageForStatus(status);
    }

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    return this.defaultMessageForStatus(status);
  }

  private resolveDetails(response: Record<string, unknown>): unknown {
    if ('details' in response) {
      return response.details;
    }

    if (Array.isArray(response.message)) {
      return response.message;
    }

    const filtered = Object.entries(response).filter(
      ([key]) => !['statusCode', 'error', 'message', 'code'].includes(key),
    );

    if (filtered.length === 0) {
      return null;
    }

    return Object.fromEntries(filtered);
  }

  private statusToErrorCode(status: number): string {
    const enumValue = HttpStatus[status];
    return typeof enumValue === 'string' ? enumValue : 'INTERNAL_SERVER_ERROR';
  }

  private defaultMessageForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Resource not found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Request failed';
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}