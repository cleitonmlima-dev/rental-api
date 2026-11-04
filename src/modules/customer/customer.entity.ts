import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'customer', name: 'customers' })
export class CustomerEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text' })
  cpf!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'clock_timestamp()' })
  createdAt!: Date;
}
