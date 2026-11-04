import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { QueryFailedError, type QueryRunner } from 'typeorm';
import type { CreatedProposal, Proposal } from '../../src/modules/proposal/interfaces/proposal.interface';
import { fixture, namedQuery } from './fixture';
import type { PropertyResponse } from './interfaces/http-response.interface';

void test('concorrência com conexões PostgreSQL independentes', { timeout: 90000 }, async (t) => {
  const { migrations, request, property } = await fixture(t);

  async function waiters(expected: number): Promise<void> {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const [row] = await migrations.query<Array<{ total: number }>>(`
        SELECT count(*)::int AS total FROM pg_locks l
        JOIN pg_stat_activity a ON a.pid=l.pid
        WHERE NOT l.granted AND a.datname=current_database()
      `);
      if (row!.total >= expected) return;
      await setImmediate();
    }
    throw new Error(`Não apareceram ${expected} transações aguardando locks.`);
  }

  async function hold(id: string): Promise<QueryRunner> {
    const runner = migrations.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await namedQuery(runner.manager, 'SELECT id FROM property.properties WHERE id = :id FOR NO KEY UPDATE', { id });
    return runner;
  }

  async function close(runner: QueryRunner): Promise<void> {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    await runner.release();
  }

  await t.test('mesma chave confirma uma proposta e reproduz a resposta', async () => {
    const one = await property();
    const key = randomUUID();
    const holder = await hold(one.property.id);
    try {
      const input = { customerId: one.customer.id, propertyId: one.property.id };
      const first = request<CreatedProposal>('POST', '/proposals', input, key);
      const second = request<CreatedProposal>('POST', '/proposals', input, key);
      await waiters(2);
      await holder.commitTransaction();
      const results = await Promise.all([first, second]);
      assert.deepEqual(results.map((result) => result.status), [201, 201]);
      assert.deepEqual(results[0]!.body, results[1]!.body);
      assert.equal(results[0]!.body.location, `/api/v1/proposals/${results[0]!.body.id}`);
      const [count] = await namedQuery<Array<{ total: string }>>(
        migrations.manager, 'SELECT count(*) AS total FROM proposal.proposals WHERE property_id = :property_id',
        { property_id: one.property.id },
      );
      assert.equal(count!.total, '1');
    } finally { await close(holder); }
  });

  await t.test('duas chaves não reservam o mesmo imóvel', async () => {
    const one = await property();
    const holder = await hold(one.property.id);
    try {
      const input = { customerId: one.customer.id, propertyId: one.property.id };
      const first = request('POST', '/proposals', input, randomUUID());
      const second = request('POST', '/proposals', input, randomUUID());
      await waiters(2);
      await holder.commitTransaction();
      const results = await Promise.all([first, second]);
      assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
    } finally { await close(holder); }
  });

  await t.test('rollback do detentor libera chave, reserva e histórico para outra tentativa', async () => {
    const one = await property();
    const key = randomUUID();
    const temporaryId = randomUUID();
    const runner = migrations.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const input = { customerId: one.customer.id, propertyId: one.property.id };
      await namedQuery(runner.manager, `
        INSERT INTO proposal.idempotency_requests (key,request_payload) VALUES (:key,CAST(:request_payload AS jsonb))
      `, { key, request_payload: JSON.stringify(input) });
      await namedQuery(runner.manager, "UPDATE property.properties SET status='EM_NEGOCIACAO' WHERE id = :id", {
        id: one.property.id,
      });
      await namedQuery(runner.manager, `
        INSERT INTO proposal.proposals (id,customer_id,property_id,status,status_entered_at,created_at,updated_at)
        VALUES (:id,:customer_id,:property_id,'NOVA',clock_timestamp(),clock_timestamp(),clock_timestamp())
      `, { id: temporaryId, customer_id: one.customer.id, property_id: one.property.id });
      const waiting = request<CreatedProposal>('POST', '/proposals', input, key);
      await waiters(1);
      await runner.rollbackTransaction();
      const result = await waiting;
      assert.equal(result.status, 201);
      assert.notEqual(result.body.id, temporaryId);
      const [count] = await namedQuery<Array<{ total: string }>>(
        migrations.manager, 'SELECT count(*) AS total FROM proposal.status_history WHERE proposal_id = :proposal_id',
        { proposal_id: temporaryId },
      );
      assert.equal(count!.total, '0');
    } finally { await close(runner); }
  });

  await t.test('imóveis diferentes não usam lock global', async () => {
    const one = await property();
    const two = await property();
    const holder = await hold(one.property.id);
    try {
      const waiting = request(
        'POST', '/proposals', { customerId: one.customer.id, propertyId: one.property.id }, randomUUID(),
      );
      await waiters(1);
      assert.equal((await request(
        'POST', '/proposals', { customerId: two.customer.id, propertyId: two.property.id }, randomUUID(),
      )).status, 201);
      await holder.commitTransaction();
      assert.equal((await waiting).status, 201);
    } finally { await close(holder); }
  });

  await t.test('ativação e cancelamento disputam a mesma reserva', async () => {
    const one = await property();
    const created = await request<CreatedProposal>(
      'POST', '/proposals', { customerId: one.customer.id, propertyId: one.property.id }, randomUUID(),
    );
    for (const status of ['ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO']) {
      await request('PATCH', `/proposals/${created.body.id}/status`, { status });
    }
    const holder = await hold(one.property.id);
    try {
      const active = request('PATCH', `/proposals/${created.body.id}/status`, { status: 'ATIVO' });
      const canceled = request('PATCH', `/proposals/${created.body.id}/status`, { status: 'CANCELADA' });
      await waiters(2);
      await holder.commitTransaction();
      assert.deepEqual((await Promise.all([active, canceled])).map((result) => result.status).sort(), [200, 409]);
      const final = await request<Proposal>('GET', `/proposals/${created.body.id}`);
      const availability = await request<PropertyResponse>('GET', `/properties/${one.property.id}`);
      assert.equal(availability.body.status, final.body.status === 'ATIVO' ? 'ALUGADO' : 'DISPONIVEL');
    } finally { await close(holder); }
  });

  await t.test('cancelamento concorrente com nova criação mantém ocupação coerente', async () => {
    const one = await property();
    const input = { customerId: one.customer.id, propertyId: one.property.id };
    const old = await request<CreatedProposal>('POST', '/proposals', input, randomUUID());
    const holder = await hold(one.property.id);
    try {
      const cancel = request('PATCH', `/proposals/${old.body.id}/status`, { status: 'CANCELADA' });
      const create = request('POST', '/proposals', input, randomUUID());
      await waiters(2);
      await holder.commitTransaction();
      const [ended, next] = await Promise.all([cancel, create]);
      assert.equal(ended.status, 200);
      assert.ok(next.status === 201 || next.status === 409);
      assert.equal(
        (await request<PropertyResponse>('GET', `/properties/${one.property.id}`)).body.status,
        next.status === 201 ? 'EM_NEGOCIACAO' : 'DISPONIVEL',
      );
    } finally { await close(holder); }
  });

  await t.test('deadlock de escritor fora da ordem reverte sem efeito parcial', async () => {
    const one = await property();
    const created = await request<CreatedProposal>(
      'POST', '/proposals', { customerId: one.customer.id, propertyId: one.property.id }, randomUUID(),
    );
    const a = await hold(one.property.id);
    const b = migrations.createQueryRunner();
    await b.connect();
    await b.startTransaction();
    async function finish<T>(query: Promise<T>, runner: QueryRunner): Promise<QueryFailedError | undefined> {
      try { await query; return undefined; } catch (error) {
        if (error instanceof QueryFailedError) return error;
        throw error;
      }
      finally { if (runner.isTransactionActive) await runner.rollbackTransaction(); }
    }
    try {
      await namedQuery(b.manager, 'SELECT id FROM proposal.proposals WHERE id = :id FOR UPDATE', {
        id: created.body.id,
      });
      const first = finish(namedQuery(a.manager, 'SELECT id FROM proposal.proposals WHERE id = :id FOR UPDATE', {
        id: created.body.id,
      }), a);
      await waiters(1);
      const second = finish(namedQuery(
        b.manager, 'SELECT id FROM property.properties WHERE id = :id FOR NO KEY UPDATE', { id: one.property.id },
      ), b);
      const errors = (await Promise.all([first, second])).filter((value) => value instanceof QueryFailedError);
      assert.equal(errors.length, 1);
      assert.equal((errors[0]!.driverError as { code?: string }).code, '40P01');
      assert.equal((await request<Proposal>('GET', `/proposals/${created.body.id}`)).body.status, 'NOVA');
    } finally { await close(a); await close(b); }
  });
});
