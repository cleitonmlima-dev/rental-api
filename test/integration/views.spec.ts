import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { QueryFailedError } from 'typeorm';
import { loadConfig } from '../../src/infra/config/configuration';
import { createDataSource } from '../../src/infra/database/create-data-source';
import type { PropertyStatus } from '../../src/modules/property/property-status';
import type { ProposalStatus } from '../../src/modules/proposal/proposal-status';
import { fixture, namedQuery } from './fixture';

void test('indicadores de negócio e acesso de observação', async (t) => {
  const { migrations, property } = await fixture(t);
  const observerUrl = process.env.TEST_OBSERVER_DATABASE_URL;
  assert.ok(
    observerUrl && new URL(observerUrl).pathname.endsWith('_test'),
    'Defina TEST_OBSERVER_DATABASE_URL para o banco isolado.',
  );
  const observer = createDataSource(loadConfig({ ...process.env, DATABASE_URL: observerUrl }));
  await observer.initialize();
  t.after(() => observer.destroy());

  const propertiesBefore = await observer.query<Array<{ status: PropertyStatus; total: string }>>(
    'SELECT * FROM proposal.property_counts ORDER BY status',
  );
  const proposalsBefore = await observer.query<Array<{ status: ProposalStatus; total: string }>>(
    'SELECT * FROM proposal.proposal_counts ORDER BY status',
  );
  assert.equal(propertiesBefore.length, 3);
  assert.equal(proposalsBefore.length, 7);
  const one = await property();
  const id = randomUUID();
  // Datas históricas conhecidas servem apenas ao cálculo dos indicadores.
  await migrations.transaction(async (manager) => {
    await namedQuery(manager, "UPDATE property.properties SET status='EM_NEGOCIACAO' WHERE id = :id", {
      id: one.property.id,
    });
    await namedQuery(manager, `
      INSERT INTO proposal.proposals (id,customer_id,property_id,status,status_entered_at,created_at,updated_at)
      VALUES (:id,:customer_id,:property_id,'NOVA','2001-02-03T00:00:00Z','2001-02-03T00:00:00Z','2001-02-03T00:00:00Z')
    `, { id, customer_id: one.customer.id, property_id: one.property.id });
    await namedQuery(manager, `
      UPDATE proposal.proposals SET status='ANALISE_CREDITO',status_entered_at='2001-02-03T00:00:10Z',
        updated_at='2001-02-03T00:00:10Z' WHERE id = :id
    `, { id });
    await namedQuery(manager, `
      UPDATE proposal.proposals SET status='CANCELADA',status_entered_at='2001-02-03T00:00:30Z',
        updated_at='2001-02-03T00:00:30Z' WHERE id = :id
    `, { id });
    await namedQuery(manager, "UPDATE property.properties SET status='DISPONIVEL' WHERE id = :id", {
      id: one.property.id,
    });
  });

  const samples = await observer.query<Array<{ status: ProposalStatus; average: number; p95: number }>>(`
    SELECT status, avg(seconds)::double precision AS average,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY seconds) AS p95
    FROM proposal.stage_durations
    WHERE exited_at >= '2001-02-03T00:00:05Z' AND exited_at < '2001-02-03T00:00:31Z'
    GROUP BY status ORDER BY status
  `);
  assert.deepEqual(samples, [
    { status: 'ANALISE_CREDITO', average: 20, p95: 20 },
    { status: 'NOVA', average: 10, p95: 10 },
  ]);
  const [empty] = await observer.query<Array<{ average: number | null }>>(`
    SELECT avg(seconds) AS average FROM proposal.stage_durations
    WHERE exited_at >= '1900-01-01' AND exited_at < '1900-01-02'
  `);
  assert.equal(empty!.average, null);
  assert.deepEqual(await observer.query<Array<{ status: PropertyStatus; total: string }>>(
    'SELECT * FROM proposal.property_counts ORDER BY status',
  ), propertiesBefore.map((row) => ({
    ...row, total: (BigInt(row.total) + (row.status === 'DISPONIVEL' ? 1n : 0n)).toString(),
  })));
  assert.deepEqual(await observer.query<Array<{ status: ProposalStatus; total: string }>>(
    'SELECT * FROM proposal.proposal_counts ORDER BY status',
  ), proposalsBefore.map((row) => ({
    ...row, total: (BigInt(row.total) + (row.status === 'CANCELADA' ? 1n : 0n)).toString(),
  })));
  assert.equal((await observer.query<Array<{ status: ProposalStatus; entered_at: Date }>>(
    "SELECT * FROM proposal.open_stages WHERE entered_at='2001-02-03T00:00:30Z'",
  )).length, 0);
  const [closure] = await observer.query<Array<{ total: number }>>(`
    SELECT count(*)::int AS total FROM proposal.closures
    WHERE status='CANCELADA' AND changed_at='2001-02-03T00:00:30Z'
  `);
  assert.ok(closure!.total >= 1);
  for (const table of ['customer.customers', 'proposal.proposals', 'proposal.status_history']) {
    await assert.rejects(() => observer.query(`SELECT * FROM ${table}`), (error: unknown) => {
      assert.ok(error instanceof QueryFailedError);
      assert.equal((error.driverError as { code: string }).code, '42501');
      return true;
    });
  }
});
