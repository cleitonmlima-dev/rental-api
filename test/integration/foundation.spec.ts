import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { test } from 'node:test';
import { createApplication } from '../../src/application';
import { DatabaseService } from '../../src/infra/database/database.service';
import type { ApiErrorResponse } from './interfaces/http-response.interface';

void test('startup e readiness usam PostgreSQL real', { timeout: 15000 }, async (t) => {
  assert.ok(process.env.DATABASE_URL, 'Defina DATABASE_URL para PostgreSQL real antes de executar integração.');

  const app = await createApplication();
  t.after(async () => {
    await app.close();
    assert.equal(app.get(DatabaseService).dataSource.isInitialized, false);
    assert.equal((app.getHttpServer() as Server).listening, false);
  });
  await app.listen(0, '127.0.0.1');
  const address = (app.getHttpServer() as Server).address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  for (const route of ['/health/live', '/health/ready']) {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(2000) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  }

  const database = app.get(DatabaseService);
  const roles = await database.dataSource.query<Array<{ role: string }>>('SELECT current_user AS role');
  assert.equal(roles[0]?.role, 'rental_app');
  const rights = await database.dataSource.query<Array<{
    rolsuper: boolean;
    rolcreatedb: boolean;
    rolcreaterole: boolean;
    database_create: boolean;
    schema_create: boolean;
    public_create: boolean;
    migrator_public_create: boolean;
    migrations_in_public: boolean;
  }>>(`
    SELECT rolsuper, rolcreatedb, rolcreaterole,
      has_database_privilege(current_user, current_database(), 'CREATE') AS database_create,
      has_schema_privilege(current_user, 'proposal', 'CREATE') AS schema_create,
      has_schema_privilege(current_user, 'public', 'CREATE') AS public_create,
      has_schema_privilege('rental_migrator', 'public', 'CREATE') AS migrator_public_create,
      to_regclass('public.typeorm_migrations') IS NOT NULL AS migrations_in_public
    FROM pg_roles WHERE rolname = current_user
  `);
  assert.deepEqual(rights[0], {
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    database_create: false,
    schema_create: false,
    public_create: false,
    migrator_public_create: true,
    migrations_in_public: true,
  });

  await database.dataSource.destroy();
  const failed = await fetch(base + '/health/ready', { signal: AbortSignal.timeout(2000) });
  assert.equal(failed.status, 503);
  const { requestId, traceId, ...body } = await failed.json() as ApiErrorResponse;
  assert.deepEqual(body, {
    statusCode: 503,
    code: 'INTERNAL_ERROR',
    message: 'Não foi possível concluir a operação.',
    path: '/health/ready',
  });
  assert.ok(requestId);
  assert.equal(requestId, failed.headers.get('X-Request-Id'));
  if (traceId !== undefined) assert.match(traceId, /^[a-f0-9]{32}$/);
  const live = await fetch(base + '/health/live', { signal: AbortSignal.timeout(2000) });
  assert.equal(live.status, 200);
  assert.deepEqual(await live.json(), { status: 'ok' });
});
