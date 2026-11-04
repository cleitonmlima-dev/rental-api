import type { z } from 'zod';
import type { CustomerEntity } from '../../../src/modules/customer/customer.entity';
import type { PropertyEntity } from '../../../src/modules/property/property.entity';
import type { apiErrorResponseSchema } from '../../../src/shared/http/schemas/api-error.schema';

export type CustomerResponse = Omit<CustomerEntity, 'createdAt'> & { createdAt: string };
export type CreatedCustomerResponse = CustomerResponse & { location: string };
export type PropertyResponse = Omit<PropertyEntity, 'createdAt' | 'updatedAt'> & {
  createdAt: string; updatedAt: string;
};
export type CreatedPropertyResponse = PropertyResponse & { location: string };
export type ApiErrorResponse = z.output<typeof apiErrorResponseSchema>;
