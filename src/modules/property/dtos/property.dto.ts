import type { z } from 'zod';
import type { createPropertySchema, propertyQuerySchema } from '../schemas/property.schema';

export type CreatePropertyDto = z.output<typeof createPropertySchema>;
export type PropertyQueryDto = z.output<typeof propertyQuerySchema>;
