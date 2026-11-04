import type { z } from 'zod';
import type { createCustomerSchema } from '../schemas/customer.schema';

export type CreateCustomerDto = z.output<typeof createCustomerSchema>;
