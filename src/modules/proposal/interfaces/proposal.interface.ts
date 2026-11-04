import type { ProposalStatus } from '../proposal-status';

export interface Proposal {
  id: string;
  customerId: string;
  propertyId: string;
  status: ProposalStatus;
  statusEnteredAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CreatedProposal = Proposal & { location: string };
