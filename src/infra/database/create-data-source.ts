import { join } from 'node:path';
import { DataSource } from 'typeorm';
import type { AppConfig } from '../config/interfaces/app-config.interface';
import { CustomerEntity } from '../../modules/customer/customer.entity';
import { PropertyEntity } from '../../modules/property/property.entity';
import { IdempotencyRequestEntity } from '../../modules/proposal/entities/idempotency-request.entity';
import { ProposalEntity } from '../../modules/proposal/entities/proposal.entity';
import { StatusHistoryEntity } from '../../modules/proposal/entities/status-history.entity';

export function createDataSource(config: AppConfig): DataSource {
  return new DataSource({
    type: 'postgres',
    url: config.databaseUrl,
    schema: 'public',
    synchronize: false,
    migrationsRun: false,
    entities: [CustomerEntity, PropertyEntity, ProposalEntity, StatusHistoryEntity, IdempotencyRequestEntity],
    migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
    migrationsTableName: 'typeorm_migrations',
    connectTimeoutMS: config.dbConnectTimeoutMs,
    logging: false,
    extra: {
      max: 10,
      connectionTimeoutMillis: config.dbConnectTimeoutMs,
      query_timeout: config.dbOperationTimeoutMs,
      options: '-c timezone=UTC ' +
        `-c lock_timeout=${config.dbLockTimeoutMs} ` +
        `-c statement_timeout=${config.dbStatementTimeoutMs}`,
    },
  });
}
