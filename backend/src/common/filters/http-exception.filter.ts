import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { redactSensitive } from '../logging/redact.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any)?.message || 'Internal server error';
      const errors =
        typeof exceptionResponse === 'object' && Array.isArray((exceptionResponse as any)?.message)
          ? (exceptionResponse as any).message
          : typeof (exceptionResponse as any)?.code === 'string'
            ? [(exceptionResponse as any).code]
            : [];

      response.status(status).json({
        success: false,
        statusCode: status,
        message: Array.isArray(message) ? 'Validation failed' : message,
        errors,
      });
      return;
    }

    const rawStatus = Number((exception as any)?.status ?? (exception as any)?.statusCode);
    if (Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 500) {
      response.status(rawStatus).json({
        success: false,
        statusCode: rawStatus,
        message: rawStatus === 413 ? 'Request payload too large' : 'Bad request',
        errors: [],
      });
      return;
    }

    const detail = exception instanceof Error ? redactSensitive(`${exception.name}: ${exception.message}`) : 'unknown error';
    this.logger.error(`Unhandled exception: ${detail}`);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errors: [],
    });
  }
}