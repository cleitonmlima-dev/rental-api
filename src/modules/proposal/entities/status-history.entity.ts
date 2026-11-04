import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ProposalStatus } from '../proposal-status';

@Entity({ schema: 'proposal', name: 'status_history' })
export class StatusHistoryEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposalId!: string;

  @Column({ name: 'from_status', type: 'enum', enum: ProposalStatus, enumName: 'proposal_status', nullable: true })
  fromStatus!: ProposalStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: ProposalStatus, enumName: 'proposal_status' })
  toStatus!: ProposalStatus;

  @Column({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId!: string | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 32, nullable: true })
  traceId!: string | null;
}
