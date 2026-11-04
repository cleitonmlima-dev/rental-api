import type { z } from 'zod';
import type {
  createProposalSchema, proposalQuerySchema, transitionProposalSchema,
} from '../schemas/proposal.schema';

export type CreateProposalDto = z.output<typeof createProposalSchema>;
export type TransitionProposalDto = z.output<typeof transitionProposalSchema>;
export type ProposalQueryDto = z.output<typeof proposalQuerySchema>;
