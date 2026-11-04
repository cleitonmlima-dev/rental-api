import { z } from 'zod';
import { paginationSchema } from '../../../shared/http/schemas/pagination.schema';
import { uuidSchema } from '../../../shared/http/schemas/primitives.schema';
import { ProposalStatus } from '../proposal-status';

const proposalStatusSchema = z.enum(ProposalStatus);

export const createProposalSchema = z.strictObject({ customerId: uuidSchema, propertyId: uuidSchema });
export const transitionProposalSchema = z.strictObject({ status: proposalStatusSchema });
export const proposalQuerySchema = paginationSchema.extend({
  status: proposalStatusSchema.optional(),
  customerId: uuidSchema.optional(),
  propertyId: uuidSchema.optional(),
});

export const idempotencyKeySchema = z.string().min(1).max(255).refine((value) => value.trim().length > 0);
