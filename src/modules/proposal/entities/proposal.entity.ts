import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ProposalStatus } from '../proposal-status';

@Entity({ schema: 'proposal', name: 'proposals' })
export class ProposalEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @Column({ type: 'enum', enum: ProposalStatus, enumName: 'proposal_status', default: ProposalStatus.NOVA })
  status!: ProposalStatus;

  @Column({ name: 'status_entered_at', type: 'timestamptz' })
  statusEnteredAt!: Date;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
