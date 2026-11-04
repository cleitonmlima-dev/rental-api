import { HttpException } from '@nestjs/common';
import type { z } from 'zod';
import type { apiErrorSchema } from './schemas/api-error.schema';

export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  PROPERTY_NOT_FOUND = 'PROPERTY_NOT_FOUND',
  PROPERTY_UNAVAILABLE = 'PROPERTY_UNAVAILABLE',
  PROPOSAL_NOT_FOUND = 'PROPOSAL_NOT_FOUND',
  PROPOSAL_TRANSITION_NOT_ALLOWED = 'PROPOSAL_TRANSITION_NOT_ALLOWED',
  IDEMPOTENCY_KEY_REUSED = 'IDEMPOTENCY_KEY_REUSED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  HTTP_ERROR = 'HTTP_ERROR',
}

export const apiErrors = {
  validation: { status: 400, code: ApiErrorCode.VALIDATION_ERROR, message: 'Dados inválidos.' },
  invalidRequest: { status: 400, code: ApiErrorCode.VALIDATION_ERROR, message: 'Requisição inválida.' },
  conflict: {
    status: 409, code: ApiErrorCode.CONFLICT, message: 'Não foi possível concluir a operação.',
  },
  customerNotFound: { status: 404, code: ApiErrorCode.CUSTOMER_NOT_FOUND, message: 'Cliente não encontrado.' },
  customerOwnerNotFound: {
    status: 404, code: ApiErrorCode.CUSTOMER_NOT_FOUND, message: 'Cliente proprietário não encontrado.',
  },
  propertyNotFound: { status: 404, code: ApiErrorCode.PROPERTY_NOT_FOUND, message: 'Imóvel não encontrado.' },
  propertyUnavailable: {
    status: 409, code: ApiErrorCode.PROPERTY_UNAVAILABLE,
    message: 'O imóvel não está disponível para uma nova proposta.',
  },
  proposalNotFound: { status: 404, code: ApiErrorCode.PROPOSAL_NOT_FOUND, message: 'Proposta não encontrada.' },
  proposalTransitionNotAllowed: {
    status: 409, code: ApiErrorCode.PROPOSAL_TRANSITION_NOT_ALLOWED,
    message: 'Transição não permitida a partir do estado atual.',
  },
  idempotencyKeyReused: {
    status: 409, code: ApiErrorCode.IDEMPOTENCY_KEY_REUSED, message: 'Chave já utilizada com outro payload.',
  },
  notFound: { status: 404, code: ApiErrorCode.NOT_FOUND, message: 'Recurso não encontrado.' },
  httpError: { status: 400, code: ApiErrorCode.HTTP_ERROR, message: 'Não foi possível concluir a operação.' },
  internalError: { status: 500, code: ApiErrorCode.INTERNAL_ERROR, message: 'Não foi possível concluir a operação.' },
} satisfies Record<string, z.output<typeof apiErrorSchema>>;

export class ApiError extends HttpException {
  constructor({ status, ...body }: z.output<typeof apiErrorSchema>) {
    super({ statusCode: status, ...body }, status);
  }
}
