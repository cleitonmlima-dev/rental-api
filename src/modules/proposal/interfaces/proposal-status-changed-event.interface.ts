import type { ProposalEventType, ProposalStatus } from '../proposal-status';

export interface ProposalStatusChangedEvent {
  eventId: string;
  type: ProposalEventType.STATUS_CHANGED;
  schemaVersion: 1;
  occurredAt: string;
  proposalId: string;
  customerId: string;
  propertyId: string;
  status: ProposalStatus;
}
