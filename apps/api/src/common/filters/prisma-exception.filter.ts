import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Turns the two Prisma errors this app can actually provoke into meaningful
 * HTTP responses, so a duplicate report week reads as a 409 rather than a 500.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined) ?? [];
        const isReportWeek =
          target.includes('weekStart') || target.includes('week_start');
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: isReportWeek
            ? 'A report already exists for that week'
            : `That ${target.join(', ') || 'value'} is already taken`,
          error: 'Conflict',
        });
      }
      case 'P2025':
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not found',
          error: 'Not Found',
        });
      default:
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Unexpected database error',
          error: 'Internal Server Error',
        });
    }
  }
}
