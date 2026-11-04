import { randomUUID } from 'node:crypto';
import { ArgumentsHost, Catch, HttpException, Logger, type ExceptionFilter } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { Request, Response } from 'express';
import { requestContext } from './request-context';
import { traceContext } from '../../infra/observability/context';
import { businessConflicts } from '../../infra/observability/metrics';
import { ApiErrorCode, apiErrors } from './api-error';

const constraints: Record<string, { status: number; code: string; message: string }> = {
  uq_customers_cpf: apiErrors.conflict,
  uq_customers_email_normalized: apiErrors.conflict,
  uq_proposals_property_occupied: apiErrors.propertyUnavailable,
  fk_properties_owner: apiErrors.customerOwnerNotFound,
  fk_proposals_customer: apiErrors.customerNotFound,
  fk_proposals_property: apiErrors.propertyNotFound,
};

export function translateError(error: unknown) {
  if (error instanceof HttpException) {
    const status = error.getStatus();
    if (status >= 500) return { ...apiErrors.internalError, status };
    const body = error.getResponse();
    if (typeof body === 'object' && 'code' in body) return { status, ...body };
    if (status === 400) return apiErrors.invalidRequest;
    if (status === 404) return apiErrors.notFound;
    return { ...apiErrors.httpError, status };
  }
  const driver: (Error & { code?: string; constraint?: string }) | undefined = error instanceof QueryFailedError
    ? error.driverError as Error & { code?: string; constraint?: string }
    : error instanceof Error ? error : undefined;
  if (driver && ['23503', '23505'].includes(driver.code ?? '') && driver.constraint && constraints[driver.constraint]) {
    return constraints[driver.constraint]!;
  }
  return apiErrors.internalError;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const { status, ...body } = translateError(error);
    const requestId = requestContext.getStore()?.requestId ?? randomUUID();
    if (status === 409) businessConflicts.add(1, { code: typeof body.code === 'string' ? body.code : 'CONFLICT' });
    if (status >= 500) {
      this.logger.error({
        code: ApiErrorCode.INTERNAL_ERROR, requestId, stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error && error.cause instanceof Error ? error.cause.stack : undefined,
      });
    }
    res.setHeader('X-Request-Id', requestId);
    res.status(status).json({
      ...body, statusCode: status, path: req.path, requestId, traceId: traceContext()?.traceId,
    });
  }
}
