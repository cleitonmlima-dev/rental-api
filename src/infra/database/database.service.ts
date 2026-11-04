import { Inject, Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { APP_CONFIG } from '../config/configuration';
import type { AppConfig } from '../config/interfaces/app-config.interface';
import { traceContext } from '../observability/context';
import { transactionCount, transactionDuration } from '../observability/metrics';
import { requestContext } from '../../shared/http/request-context';
import { createDataSource } from './create-data-source';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  readonly dataSource;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.dataSource = createDataSource(config);
  }

  async onModuleInit(): Promise<void> {
    await this.dataSource.initialize();
  }

  async ping(): Promise<void> {
    await this.dataSource.query('SELECT 1');
  }

  async now(manager: EntityManager = this.dataSource.manager): Promise<Date> {
    const [instant] = await manager.query<Array<{ now: Date }>>('SELECT clock_timestamp() AS now');
    return instant!.now;
  }

  async transaction<T>(operation: string, work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const started = performance.now();
    let outcome = 'rollback';
    try {
      const result = await this.dataSource.transaction('READ COMMITTED', async (manager) => {
        const [sql, parameters] = manager.connection.driver.escapeQueryWithParameters(`
          SELECT set_config('app.request_id', :request_id, true), set_config('app.trace_id', :trace_id, true),
            set_config('transaction_timeout', :transaction_timeout, true)
        `, {
          request_id: requestContext.getStore()?.requestId ?? '',
          trace_id: traceContext()?.traceId ?? '',
          transaction_timeout: `${this.config.dbOperationTimeoutMs}ms`,
        }, {});
        await manager.query(sql, parameters);
        return work(manager);
      });
      outcome = 'commit';
      return result;
    } finally {
      transactionCount.add(1, { operation, result: outcome });
      transactionDuration.record((performance.now() - started) / 1000, { operation, result: outcome });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }
}
