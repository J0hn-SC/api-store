import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { GqlArgumentsHost, GqlContextType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const hostType = host.getType<GqlContextType>();

        // Common error details
        let message = 'Internal server error';
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let errorCode: string | undefined;

        // 1. Handle standard HttpException
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const response = exception.getResponse();
            message = (response as any).message || exception.message;
        }
        // 2. Handle Prisma Client Errors
        else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            const prismaError = this.handlePrismaError(exception);
            status = prismaError.status;
            message = prismaError.message;
            errorCode = exception.code;
        }
        // 3. Fallback for other errors
        else if (exception instanceof Error) {
            message = exception.message;
        }

        this.logger.error(
            `[${hostType}] Error ${status}: ${message}`,
            exception instanceof Error ? exception.stack : undefined,
        );

        // Context-specific response
        if (hostType === 'graphql') {
            // In GraphQL, we return the exception. 
            // NestJS will automatically wrap it in the expected format.
            // We can also let it propagate or return a formatted object if using custom error handling.
            // For standard setup, we can throw the exception to let Apollo handle it.
            return exception;
        } else {
            // REST response
            const ctx = host.switchToHttp();
            const response = ctx.getResponse<Response>();
            const request = ctx.getRequest<Request>();

            response.status(status).json({
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: request.url,
                message,
                errorCode,
            });
        }
    }

    private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError) {
        switch (exception.code) {
            case 'P2002': {
                const target = (exception.meta?.target as string[]) || [];
                return {
                    status: HttpStatus.CONFLICT,
                    message: `Unique constraint failed on field(s): ${target.join(', ')}`,
                };
            }
            case 'P2025':
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: 'Record to update or delete not found.',
                };
            case 'P2003':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: 'Foreign key constraint failed.',
                };
            default:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: `Database error: ${exception.message}`,
                };
        }
    }
}
