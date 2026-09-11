import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null;

    const message = typeof exceptionResponse === 'string'
      ? exceptionResponse
      : (exceptionResponse as any)?.message || 'Internal server error';

    const errors = typeof exceptionResponse === 'object' && Array.isArray((exceptionResponse as any)?.message)
      ? (exceptionResponse as any).message
      : [];

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? 'Validation failed' : message,
      errors,
    });
  }
}