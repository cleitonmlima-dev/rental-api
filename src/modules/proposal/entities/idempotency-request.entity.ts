import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { CreatedProposal } from '../interfaces/proposal.interface';

@Entity({ schema: 'proposal', name: 'idempotency_requests' })
export class IdempotencyRequestEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  key!: string;

  @Column({ name: 'request_payload', type: 'jsonb' })
  requestPayload!: { customerId: string; propertyId: string };

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody!: CreatedProposal | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'clock_timestamp()' })
  createdAt!: Date;
}
