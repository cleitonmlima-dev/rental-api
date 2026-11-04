import { z } from 'zod';
import { paginationSchema } from '../../../shared/http/schemas/pagination.schema';
import { requiredTextSchema, uuidSchema } from '../../../shared/http/schemas/primitives.schema';
import { PropertyStatus, PropertyType } from '../property-status';

const propertyTypeSchema = z.enum(PropertyType);

export const createPropertySchema = z.strictObject({
  ownerId: uuidSchema,
  address: requiredTextSchema.max(500),
  type: propertyTypeSchema,
  description: z.string().trim().max(1000).nullable().optional()
    .transform((value) => value === '' ? null : value),
});

export const propertyQuerySchema = paginationSchema.extend({
  status: z.enum(PropertyStatus).optional(),
  type: propertyTypeSchema.optional(),
  ownerId: uuidSchema.optional(),
});
