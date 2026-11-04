import { applyDecorators } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { z } from 'zod';
import { propertyStatuses, propertyTypes } from '../../modules/property/property-status';
import { proposalStatuses } from '../../modules/proposal/proposal-status';
import { apiErrorResponseSchema } from './schemas/api-error.schema';
import { paginationMetaSchema } from './schemas/pagination.schema';

export function inputSchema(schema: z.ZodType): SchemaObject {
  return z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' }) as SchemaObject;
}

export function ApiQuerySchema(schema: z.ZodType) {
  const contract = z.toJSONSchema(schema, { target: 'openapi-3.0' }) as SchemaObject;
  const required = inputSchema(schema).required ?? [];
  return applyDecorators(...Object.entries(contract.properties ?? {}).map(([name, property]) =>
    ApiQuery({ name, required: required.includes(name), schema: property }),
  ));
}

const id: SchemaObject = { type: 'string', format: 'uuid' };
const instant: SchemaObject = { type: 'string', format: 'date-time' };

const errorSchema = inputSchema(apiErrorResponseSchema);

export function ApiErrorResponses() {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Dados ou header inválidos.', schema: errorSchema }),
    ApiResponse({ status: 404, description: 'Recurso não encontrado.', schema: errorSchema }),
    ApiResponse({
      status: 409, description: 'Unicidade, estado, disponibilidade ou chave em conflito.', schema: errorSchema,
    }),
    ApiResponse({ status: 500, description: 'Não foi possível concluir a operação.', schema: errorSchema }),
  );
}

export const customerSchema: SchemaObject = {
  type: 'object', required: ['id', 'name', 'cpf', 'email', 'createdAt'],
  properties: {
    id, name: { type: 'string' }, cpf: { type: 'string' },
    email: { type: 'string', format: 'email' }, createdAt: instant,
  },
};

export const propertySchema: SchemaObject = {
  type: 'object', required: ['id', 'ownerId', 'address', 'type', 'description', 'status', 'createdAt', 'updatedAt'],
  properties: {
    id, ownerId: id, address: { type: 'string' }, type: { type: 'string', enum: [...propertyTypes] },
    description: { type: 'string', nullable: true }, status: { type: 'string', enum: [...propertyStatuses] },
    createdAt: instant, updatedAt: instant,
  },
};

export const proposalSchema: SchemaObject = {
  type: 'object', required: ['id', 'customerId', 'propertyId', 'status', 'statusEnteredAt', 'createdAt', 'updatedAt'],
  properties: {
    id, customerId: id, propertyId: id, status: { type: 'string', enum: [...proposalStatuses] },
    statusEnteredAt: instant, createdAt: instant, updatedAt: instant,
  },
};

export const historySchema: SchemaObject = {
  type: 'object', required: ['id', 'fromStatus', 'toStatus', 'changedAt'],
  properties: {
    id: { type: 'string' }, fromStatus: { type: 'string', nullable: true, enum: [...proposalStatuses] },
    toStatus: { type: 'string', enum: [...proposalStatuses] }, changedAt: instant,
  },
};

export function creationSchema(resource: SchemaObject): SchemaObject {
  return {
    ...resource,
    required: [...(resource.required ?? []), 'location'],
    properties: { ...resource.properties, location: { type: 'string' } },
  };
}

export function pageSchema(resource: SchemaObject): SchemaObject {
  return {
    type: 'object', required: ['data', 'meta'],
    properties: {
      data: { type: 'array', items: resource },
      meta: inputSchema(paginationMetaSchema),
    },
  };
}
