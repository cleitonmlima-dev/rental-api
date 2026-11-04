import type { TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { loadMigrationConfig } from '../../src/infra/config/configuration';
import { createDataSource } from '../../src/infra/database/create-data-source';
import { createApplication } from '../../src/application';
import type { CreatedCustomerResponse, CreatedPropertyResponse } from './interfaces/http-response.interface';

export function namedQuery<T>(
  manager: EntityManager, statement: string, parameters: Record<string, string>,
): Promise<T> {
  const [sql, values] = manager.connection.driver.escapeQueryWithParameters(statement, parameters, {});
  return manager.query<T>(sql, values);
}

export async function fixture(t: TestContext, environment: Record<string, string> = {}) {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  const migrationUrl = process.env.TEST_MIGRATION_DATABASE_URL;
  if (!databaseUrl || !migrationUrl ||
    !new URL(databaseUrl).pathname.endsWith('_test') || !new URL(migrationUrl).pathname.endsWith('_test')) {
    throw new Error('Defina TEST_DATABASE_URL e TEST_MIGRATION_DATABASE_URL para o banco isolado terminado em _test.');
  }
  const values = {
    DATABASE_URL: databaseUrl, MIGRATION_DATABASE_URL: migrationUrl,
    DB_LOCK_TIMEOUT_MS: '4000', DB_STATEMENT_TIMEOUT_MS: '6000',
    DB_OPERATION_TIMEOUT_MS: '10000',
    ...environment,
  };
  const original = new Map(Object.keys(values).map((key): [string, string | undefined] => [key, process.env[key]]));
  Object.assign(process.env, values);
  const migrations = createDataSource(loadMigrationConfig(process.env));
  let app: INestApplication | undefined;
  t.after(async () => {
    try { await app?.close(); } finally {
      if (migrations.isInitialized) await migrations.destroy();
      for (const [key, value] of original) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });
  await migrations.initialize();
  await migrations.runMigrations();
  app = await createApplication();
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();

  async function request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, input?: object, key?: string) {
    const response = await fetch(base + '/api/v1' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(key === undefined ? {} : { 'Idempotency-Key': key }) },
      body: input === undefined ? undefined : JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    });
    return {
      status: response.status, body: await response.json() as T,
      locationHeader: response.headers.get('Location'), requestId: response.headers.get('X-Request-Id'),
    };
  }

  async function property() {
    const unique = randomUUID();
    const cpf = BigInt('0x' + unique.replace(/-/g, '')).toString();
    const customer = await request<CreatedCustomerResponse>(
      'POST', '/customers', { name: 'Cliente teste', cpf, email: `${unique}@example.com` },
    );
    if (customer.status !== 201) throw new Error(`Falha ao criar fixture cliente: ${customer.status}`);
    const result = await request<CreatedPropertyResponse>(
      'POST', '/properties', { ownerId: customer.body.id, address: 'Rua de teste, 100', type: 'CASA' },
    );
    if (result.status !== 201) throw new Error(`Falha ao criar fixture imóvel: ${result.status}`);
    return { customer: customer.body, property: result.body };
  }
  return { app, migrations, request, property };
}
