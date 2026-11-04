import { Column, Entity, PrimaryColumn } from 'typeorm';
import { PropertyStatus, type PropertyType } from './property-status';

@Entity({ schema: 'property', name: 'properties' })
export class PropertyEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'varchar', length: 500 })
  address!: string;

  @Column({ type: 'text' })
  type!: PropertyType;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ type: 'text', default: PropertyStatus.DISPONIVEL })
  status!: PropertyStatus;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
