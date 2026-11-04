import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { HttpException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { OpenAPIObject } from '@nestjs/swagger';
import { DatabaseService } from '../../src/infra/database/database.service';
import { CustomerRepository } from '../../src/modules/customer/customer.repository';
import { ProposalStatusPublisher } from '../../src/modules/proposal/proposal-status.publisher';
import { canTransition } from '../../src/modules/proposal/proposal-transitions';
import type { CreatedProposal, Proposal } from '../../src/modules/proposal/interfaces/proposal.interface';
import type { PropertyStatus } from '../../src/modules/property/property-status';
import { proposalStatuses, type ProposalStatus } from '../../src/modules/proposal/proposal-status';
import { fixture, namedQuery } from './fixture';
import type {
  ApiErrorResponse, CreatedCustomerResponse, CreatedPropertyResponse, CustomerResponse, PropertyResponse,
} from './interfaces/http-response.interface';

void test('contratos e jornada transacional', { timeout: 60000 }, async (t) => {
  const { app, migrations, request, property } = await fixture(t);

  await t.test('OpenAPI descreve entrada estrita, idempotência e erros', async () => {
    const response = await fetch(await app.getUrl() + '/docs-json');
    assert.equal(response.status, 200);
    const document = await response.json() as OpenAPIObject;
    const customerBody = document.paths['/api/v1/customers']!.post!.requestBody!;
    assert.ok(!('$ref' in customerBody));
    const customerInput = customerBody.content['application/json']!.schema!;
    assert.ok(!('$ref' in customerInput));
    assert.equal(customerInput.additionalProperties, false);
    const creation = document.paths['/api/v1/proposals']!.post!;
    assert.ok(creation.parameters!.some((item) =>
      !('$ref' in item) && item.name === 'Idempotency-Key' && item.required,
    ));
    for (const status of ['201', '400', '409', '500']) assert.ok(creation.responses![status]);
    const invalid = creation.responses!['400']!;
    assert.ok(!('$ref' in invalid));
    const invalidSchema = invalid.content!['application/json']!.schema!;
    assert.ok(!('$ref' in invalidSchema));
    assert.ok(invalidSchema.required!.includes('statusCode'));
    assert.ok(invalidSchema.required!.includes('code'));
    assert.ok(invalidSchema.required!.includes('message'));
    assert.equal(invalidSchema.required!.includes('details'), false);
    assert.equal(invalidSchema.properties!.status, undefined);
    const details = invalidSchema.properties!.details!;
    assert.ok(!('$ref' in details));
    assert.equal(details.type, 'array');
    for (const resource of ['customers', 'properties', 'proposals']) {
      const routes = document.paths[`/api/v1/${resource}`]!;
      for (const method of ['get', 'post'] as const) {
        for (const status of ['400', '404', '409', '500']) assert.ok(routes[method]!.responses[status]);
        assert.equal(routes[method]!.responses['503'], undefined);
      }
      const created = routes.post!.responses!['201']!;
      assert.ok(!('$ref' in created));
      const createdSchema = created.content!['application/json']!.schema!;
      assert.ok(!('$ref' in createdSchema));
      assert.ok(createdSchema.required!.includes('location'));
      const location = createdSchema.properties!.location!;
      assert.ok(!('$ref' in location));
      assert.equal(location.type, 'string');
      assert.equal(created.headers?.Location, undefined);
      const retrieved = document.paths[`/api/v1/${resource}/{id}`]!.get!.responses!['200']!;
      assert.ok(!('$ref' in retrieved));
      const retrievedSchema = retrieved.content!['application/json']!.schema!;
      assert.ok(!('$ref' in retrievedSchema));
      assert.equal(retrievedSchema.properties!.location, undefined);
    }
    const filters = document.paths['/api/v1/properties']!.get!.parameters!;
    for (const name of ['page', 'limit', 'status', 'type', 'ownerId']) {
      assert.ok(filters.some((item) => !('$ref' in item) && item.name === name && !item.required));
    }
    const limit = filters.find((item) => !('$ref' in item) && item.name === 'limit')!;
    assert.ok(!('$ref' in limit));
    const limitSchema = limit.schema!;
    assert.ok(!('$ref' in limitSchema));
    assert.equal(limitSchema.maximum, 100);
    assert.equal(limitSchema.default, 20);
    const readiness = document.paths['/health/ready']!.get!.responses['503']!;
    assert.ok(!('$ref' in readiness));
    assert.equal(readiness.description, 'Não foi possível concluir a operação.');
  });

  await t.test('HTTP sanitiza banco, rede e exceções internas preservando correlação', async (caseContext) => {
    const path = `/customers/${randomUUID()}`;
    for (const error of [
      ...['55P03', '40P01', '57P03', '23505'].map((code) => new QueryFailedError(
        'SELECT private-sql', ['private-parameter'],
        Object.assign(new Error('private-database-host'), { code, constraint: 'private-index' }),
      )),
      Object.assign(new Error('private-network-host'), { code: 'ECONNREFUSED' }),
      new Error('Resultado idempotente indisponível.'),
      new HttpException({
        code: 'PRIVATE_CODE', message: 'Reserva inconsistente.', details: ['private-detail'], status: 400,
      }, 500),
    ]) {
      const lookup = caseContext.mock.method(app.get(CustomerRepository), 'findById', async () => { throw error; });
      const result = await request<ApiErrorResponse>('GET', path);
      assert.equal(result.status, 500);
      const { requestId, traceId, ...body } = result.body;
      assert.deepEqual(body, {
        statusCode: 500, code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.',
        path: '/api/v1' + path,
      });
      assert.ok(requestId);
      assert.equal(requestId, result.requestId);
      if (traceId !== undefined) assert.match(traceId, /^[a-f0-9]{32}$/);
      lookup.mock.restore();
    }
  });

  await t.test('UUIDs e consultas inválidas são rejeitados com detalhes sem eco da entrada', async () => {
    for (const path of [
      '/customers/private-value', '/properties?page=0', '/proposals?limit=101',
      '/properties?status=private-value', '/customers?page=1&page=2', '/customers?unknown=private-value',
    ]) {
      const result = await request<ApiErrorResponse>('GET', path);
      assert.equal(result.status, 400);
      assert.equal(result.body.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(result.body.details));
      assert.ok(!JSON.stringify(result.body.details).includes('private-value'));
    }
  });

  await t.test('cadastros, unicidades, endereço repetido e filtros', async () => {
    const one = await property();
    assert.equal(one.customer.location, `/api/v1/customers/${one.customer.id}`);
    assert.equal(one.property.location, `/api/v1/properties/${one.property.id}`);
    for (const location of [one.customer.location, one.property.location]) {
      const retrieved = await request<CustomerResponse | PropertyResponse>('GET', location.replace('/api/v1', ''));
      assert.equal(retrieved.status, 200);
      assert.equal(Object.hasOwn(retrieved.body, 'location'), false);
    }
    const cpfConflict = await request<ApiErrorResponse>('POST', '/customers', {
      name: 'Outra pessoa', cpf: one.customer.cpf, email: `${randomUUID()}@example.com`,
    });
    assert.equal(cpfConflict.status, 409);
    assert.equal(cpfConflict.body.code, 'CONFLICT');
    assert.equal(cpfConflict.body.message, 'Não foi possível concluir a operação.');
    const emailConflict = await request<ApiErrorResponse>('POST', '/customers', {
      name: 'Outra pessoa', cpf: '9' + one.customer.cpf, email: one.customer.email.toUpperCase(),
    });
    assert.equal(emailConflict.status, 409);
    assert.equal(emailConflict.body.code, 'CONFLICT');
    assert.equal(emailConflict.body.message, 'Não foi possível concluir a operação.');
    const duplicateAddress = await request<CreatedPropertyResponse>('POST', '/properties', {
      ownerId: one.customer.id, address: 'Rua de teste, 100', type: 'CASA',
    });
    assert.equal(duplicateAddress.status, 201);
    assert.equal(duplicateAddress.body.location, `/api/v1/properties/${duplicateAddress.body.id}`);
    assert.equal(duplicateAddress.locationHeader, null);
    const anotherCustomer = await request<CreatedCustomerResponse>('POST', '/customers', {
      name: 'Outra pessoa', cpf: '9' + one.customer.cpf, email: `${randomUUID()}@example.com`,
    });
    assert.equal(anotherCustomer.status, 201);
    assert.equal(anotherCustomer.body.location, `/api/v1/customers/${anotherCustomer.body.id}`);
    assert.equal(anotherCustomer.locationHeader, null);
    const missingOwner = await request('POST', '/properties', { ownerId: randomUUID(), address: 'Rua', type: 'CASA' });
    assert.equal(missingOwner.status, 404);
    const list = await request<{ data: Array<{ ownerId: string }>; meta: { total: number } }>(
      'GET', `/properties?ownerId=${one.customer.id}&type=CASA&status=DISPONIVEL`,
    );
    assert.equal(list.body.meta.total, 2);
    assert.ok(list.body.data.every((row) => row.ownerId === one.customer.id));
    const extra = await request<ApiErrorResponse>('POST', '/customers', {
      name: 'Nome', cpf: '123', email: 'a@example.com', unknown: 'private-value',
    });
    assert.equal(extra.status, 400);
    assert.ok(!JSON.stringify(extra.body).includes('private-value'));
  });

  await t.test('criação/replay e chave com payload diferente', async () => {
    const one = await property();
    const key = randomUUID();
    const input = { customerId: one.customer.id, propertyId: one.property.id };
    assert.equal((await request('POST', '/proposals', input)).status, 400);
    const created = await request<CreatedProposal>('POST', '/proposals', input, key);
    assert.equal(created.status, 201);
    assert.equal(created.body.status, 'NOVA');
    assert.equal(created.body.location, `/api/v1/proposals/${created.body.id}`);
    assert.equal(created.locationHeader, null);
    const [saved] = await namedQuery<Array<{ body: CreatedProposal }>>(
      migrations.manager, 'SELECT response_body AS body FROM proposal.idempotency_requests WHERE key = :key', { key },
    );
    assert.deepEqual(saved!.body, created.body);
    const replay = await request<CreatedProposal>('POST', '/proposals', input, key);
    assert.equal(replay.status, 201);
    assert.deepEqual(replay.body, created.body);
    const equivalent = await request<CreatedProposal>(
      'POST', '/proposals', {
        propertyId: input.propertyId.toUpperCase(), customerId: input.customerId.toUpperCase(),
      }, key,
    );
    assert.deepEqual(equivalent.body, created.body);
    assert.equal(replay.locationHeader, null);
    assert.notEqual(replay.requestId, created.requestId);
    assert.equal((await request('POST', '/proposals', { ...input, propertyId: randomUUID() }, key)).status, 409);
    assert.equal(
      (await request<ApiErrorResponse>('POST', '/proposals', input, randomUUID())).body.code, 'PROPERTY_UNAVAILABLE',
    );
    const history = await request<{
      data: Array<{ id: string; fromStatus: ProposalStatus | null; toStatus: ProposalStatus }>; meta: { total: number };
    }>('GET', `/proposals/${created.body.id}/history`);
    assert.equal(history.body.meta.total, 1);
    assert.equal(typeof history.body.data[0]!.id, 'string');
    assert.equal(history.body.data[0]!.fromStatus, null);
    assert.equal(history.body.data[0]!.toStatus, 'NOVA');
    assert.equal((await request('GET', `/proposals/${randomUUID()}/history`)).status, 404);
    assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: 'ATIVO' })).status, 409);
    assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: 'OUTRO' })).status, 400);
    const advanced = await request<Proposal>('PATCH', `/proposals/${created.body.id}/status`, {
      status: 'ANALISE_CREDITO',
    });
    assert.equal(advanced.status, 200);
    assert.equal(Object.hasOwn(advanced.body, 'location'), false);
    const advancedReplay = await request<CreatedProposal>('POST', '/proposals', input, key);
    assert.equal(advancedReplay.status, 201);
    assert.deepEqual(advancedReplay.body, created.body);
    assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: 'CANCELADA' })).status, 200);
    const retrieved = await request<Proposal>('GET', `/proposals/${created.body.id}`);
    assert.equal(retrieved.body.status, 'CANCELADA');
    assert.equal(Object.hasOwn(retrieved.body, 'location'), false);
    const canceledReplay = await request<CreatedProposal>('POST', '/proposals', input, key);
    assert.equal(canceledReplay.status, 201);
    assert.deepEqual(canceledReplay.body, created.body);
    assert.equal((await request('POST', '/proposals', input, randomUUID())).status, 201);
  });

  await t.test('retry recupera commit cujo corpo o cliente não consumiu', async () => {
    const one = await property();
    const key = randomUUID();
    const input = { customerId: one.customer.id, propertyId: one.property.id };
    const response = await fetch(await app.getUrl() + '/api/v1/proposals', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 201);
    await response.body?.cancel();
    const [saved] = await namedQuery<Array<{ body: CreatedProposal }>>(
      migrations.manager, 'SELECT response_body AS body FROM proposal.idempotency_requests WHERE key = :key', { key },
    );
    assert.equal(saved!.body.location, `/api/v1/proposals/${saved!.body.id}`);
    const retry = await request<CreatedProposal>('POST', '/proposals', input, key);
    assert.equal(retry.status, 201);
    assert.deepEqual(retry.body, saved!.body);
  });

  await t.test('cliente ausente depois da reserva reverte chave e disponibilidade', async () => {
    const one = await property();
    const key = randomUUID();
    const failed = await request('POST', '/proposals', { customerId: randomUUID(), propertyId: one.property.id }, key);
    assert.equal(failed.status, 404);
    const [row] = await namedQuery<Array<{ status: PropertyStatus; keys: string; proposals: string }>>(
      migrations.manager, `
      SELECT status, (SELECT count(*) FROM proposal.idempotency_requests WHERE key = :key) AS keys,
        (SELECT count(*) FROM proposal.proposals WHERE property_id = :property_id) AS proposals
      FROM property.properties WHERE id = :property_id
    `, { property_id: one.property.id, key });
    assert.equal(row!.status, 'DISPONIVEL');
    assert.equal(row!.keys, '0');
    assert.equal(row!.proposals, '0');
    assert.equal((await request(
      'POST', '/proposals', { customerId: one.customer.id, propertyId: one.property.id }, key,
    )).status, 201);
  });

  await t.test('falha ao salvar resposta reverte também proposta e histórico', async () => {
    const one = await property();
    const key = randomUUID();
    const name = 'fail_' + randomUUID().replace(/-/g, '');
    await migrations.query(`
      CREATE FUNCTION proposal.${name}() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'forced test failure'; END $$;
      CREATE TRIGGER ${name} BEFORE UPDATE ON proposal.idempotency_requests
        FOR EACH ROW EXECUTE FUNCTION proposal.${name}()
    `);
    try {
      assert.equal((await request(
        'POST', '/proposals', { customerId: one.customer.id, propertyId: one.property.id }, key,
      )).status, 500);
      const [row] = await namedQuery<Array<{ status: PropertyStatus; proposals: string; keys: string }>>(
        migrations.manager, `
        SELECT status, (SELECT count(*) FROM proposal.proposals WHERE property_id = :property_id) AS proposals,
          (SELECT count(*) FROM proposal.idempotency_requests WHERE key = :key) AS keys
        FROM property.properties WHERE id = :property_id
      `, { property_id: one.property.id, key });
      assert.deepEqual(row, { status: 'DISPONIVEL', proposals: '0', keys: '0' });
    } finally {
      await migrations.query(`DROP TRIGGER ${name} ON proposal.idempotency_requests; DROP FUNCTION proposal.${name}()`);
    }
    assert.equal((await request(
      'POST', '/proposals', { customerId: one.customer.id, propertyId: one.property.id }, key,
    )).status, 201);
  });

  await t.test('cancelar/reprovar a partir de cada etapa libera o imóvel', async () => {
    const path = ['NOVA', 'ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO', 'ATIVO'];
    for (const from of proposalStatuses) {
      for (const to of proposalStatuses) {
        const index = path.indexOf(from);
        const allowed = index >= 0 && index < 4 && (to === path[index + 1] || to === 'CANCELADA' || to === 'REPROVADA');
        assert.equal(canTransition(from, to), allowed);
      }
    }
    const stages = ['NOVA', 'ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO'];
    for (const stage of stages) {
      for (const ending of ['CANCELADA', 'REPROVADA']) {
        const one = await property();
        const input = { customerId: one.customer.id, propertyId: one.property.id };
        const created = await request<CreatedProposal>('POST', '/proposals', input, randomUUID());
        for (const next of stages.slice(1, stages.indexOf(stage) + 1)) {
          assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: next })).status, 200);
        }
        assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: ending })).status, 200);
        assert.equal(
          (await request<PropertyResponse>('GET', `/properties/${one.property.id}`)).body.status, 'DISPONIVEL',
        );
        assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: ending })).status, 409);
        assert.equal((await request('POST', '/proposals', input, randomUUID())).status, 201);
      }
    }
  });

  await t.test('falha do publicador não desfaz ativação e repetição não publica', async (caseContext) => {
    const one = await property();
    const key = randomUUID();
    const input = { customerId: one.customer.id, propertyId: one.property.id };
    const created = await request<CreatedProposal>('POST', '/proposals', input, key);
    for (const status of ['ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO']) {
      assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status })).status, 200);
    }
    const publish = caseContext.mock.method(app.get(ProposalStatusPublisher), 'publish', async () => {
      throw new Error('simulated publication failure');
    });
    const activated = await request<Proposal>('PATCH', `/proposals/${created.body.id}/status`, { status: 'ATIVO' });
    assert.equal(activated.status, 200);
    assert.equal(publish.mock.callCount(), 1);
    assert.equal((await request<PropertyResponse>('GET', `/properties/${one.property.id}`)).body.status, 'ALUGADO');
    assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: 'ATIVO' })).status, 409);
    assert.equal(publish.mock.callCount(), 1);
    const replay = await request<CreatedProposal>('POST', '/proposals', input, key);
    assert.equal(replay.status, 201);
    assert.deepEqual(replay.body, created.body);
    const history = await request<{ meta: { total: number } }>('GET', `/proposals/${created.body.id}/history`);
    assert.equal(history.body.meta.total, 5);
  });

  await t.test('falha na sincronização do imóvel reverte transição e histórico', async (caseContext) => {
    const one = await property();
    const created = await request<CreatedProposal>(
      'POST', '/proposals', { customerId: one.customer.id, propertyId: one.property.id }, randomUUID(),
    );
    for (const status of ['ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO']) {
      assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status })).status, 200);
    }
    const publish = caseContext.mock.method(app.get(ProposalStatusPublisher), 'publish');
    const name = 'fail_' + randomUUID().replace(/-/g, '');
    await migrations.query(`CREATE FUNCTION property.${name}() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.status='ALUGADO' THEN RAISE EXCEPTION 'forced test failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER ${name} BEFORE UPDATE ON property.properties FOR EACH ROW EXECUTE FUNCTION property.${name}()`);
    try {
      assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: 'ATIVO' })).status, 500);
      assert.equal((await request<Proposal>('GET', `/proposals/${created.body.id}`)).body.status, 'ASSINADO');
      assert.equal(
        (await request<PropertyResponse>('GET', `/properties/${one.property.id}`)).body.status, 'EM_NEGOCIACAO',
      );
      const history = await request<{ meta: { total: number } }>('GET', `/proposals/${created.body.id}/history`);
      assert.equal(history.body.meta.total, 4);
      assert.equal(publish.mock.callCount(), 0);
    } finally {
      await migrations.query(`DROP TRIGGER ${name} ON property.properties; DROP FUNCTION property.${name}()`);
    }
    assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: 'ATIVO' })).status, 200);
    assert.equal(publish.mock.callCount(), 1);
  });

  await t.test('papel da API não manipula histórico ou referências existentes', async () => {
    const source = app.get(DatabaseService).dataSource;
    await assert.rejects(() => namedQuery(source.manager, `
      INSERT INTO proposal.status_history (proposal_id,to_status,changed_at)
      VALUES (:proposal_id,'NOVA',clock_timestamp())
    `, { proposal_id: randomUUID() }), (error: unknown) => {
      assert.ok(error instanceof QueryFailedError);
      assert.equal((error.driverError as { code: string }).code, '42501');
      return true;
    });
    const [privileges] = await source.query<Array<{ reference_update: boolean; status_update: boolean }>>(`
      SELECT has_column_privilege(current_user,'proposal.proposals','customer_id','UPDATE') AS reference_update,
        has_column_privilege(current_user,'proposal.proposals','status','UPDATE') AS status_update
    `);
    assert.deepEqual(privileges, { reference_update: false, status_update: true });
    const [context] = await source.query<Array<{ value: string | null }>>(
      "SELECT NULLIF(current_setting('app.request_id',true),'') AS value",
    );
    assert.equal(context!.value, null);
  });
});
