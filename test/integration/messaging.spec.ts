import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { Logger } from '@nestjs/common';
import { CreateTopicCommand, DeleteTopicCommand, SNSClient, SubscribeCommand } from '@aws-sdk/client-sns';
import {
  CreateQueueCommand, DeleteMessageCommand, DeleteQueueCommand, GetQueueAttributesCommand,
  ReceiveMessageCommand, SetQueueAttributesCommand, SQSClient,
} from '@aws-sdk/client-sqs';
import type { CreatedProposal, Proposal } from '../../src/modules/proposal/interfaces/proposal.interface';
import type {
  ProposalStatusChangedEvent,
} from '../../src/modules/proposal/interfaces/proposal-status-changed-event.interface';
import { ProposalRepository } from '../../src/modules/proposal/proposal.repository';
import { ProposalStatusPublisher } from '../../src/modules/proposal/proposal-status.publisher';
import { publicationFailures, transactionDuration } from '../../src/infra/observability/metrics';
import { fixture, namedQuery } from './fixture';
import type { PropertyResponse } from './interfaces/http-response.interface';

const statuses = ['NOVA', 'ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO', 'ATIVO', 'CANCELADA', 'REPROVADA'];

async function messaging(t: TestContext) {
  const endpoint = process.env.AWS_ENDPOINT_URL;
  assert.ok(endpoint, 'Defina AWS_ENDPOINT_URL para o LocalStack.');
  const url = new URL(endpoint);
  assert.ok(['127.0.0.1', 'localhost', 'localstack'].includes(url.hostname), 'Integração exige endpoint local.');
  assert.equal(url.protocol, 'http:');
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const config = { endpoint, region, credentials: { accessKeyId: 'test', secretAccessKey: 'test' }, maxAttempts: 1 };
  const sns = new SNSClient(config);
  const sqs = new SQSClient(config);
  const queues = new Map<string, string>();
  let topicArn: string | undefined = undefined;
  let deleted = false;
  t.after(async () => {
    try {
      if (topicArn && !deleted) await sns.send(new DeleteTopicCommand({ TopicArn: topicArn }));
    } finally {
      const cleanup = await Promise.allSettled([...queues.values()].map((QueueUrl) =>
        sqs.send(new DeleteQueueCommand({ QueueUrl }))));
      sns.destroy();
      sqs.destroy();
      for (const result of cleanup) if (result.status === 'rejected') throw result.reason;
    }
  });
  const prefix = `rental-test-${randomUUID()}`;
  topicArn = (await sns.send(new CreateTopicCommand({ Name: prefix }))).TopicArn;
  assert.ok(topicArn);
  assert.equal(topicArn.split(':')[4], '000000000000', 'Integração exige conta local.');
  for (const status of statuses) {
    const QueueUrl = (await sqs.send(new CreateQueueCommand({ QueueName: `${prefix}-${status}` }))).QueueUrl;
    assert.ok(QueueUrl);
    queues.set(status, QueueUrl);
    const attributes = await sqs.send(new GetQueueAttributesCommand({ QueueUrl, AttributeNames: ['QueueArn'] }));
    const queueArn = attributes.Attributes?.QueueArn;
    assert.ok(queueArn);
    await sqs.send(new SetQueueAttributesCommand({ QueueUrl, Attributes: { Policy: JSON.stringify({
      Version: '2012-10-17', Statement: [{
        Effect: 'Allow', Principal: { Service: 'sns.amazonaws.com' }, Action: 'sqs:SendMessage', Resource: queueArn,
        Condition: { ArnEquals: { 'aws:SourceArn': topicArn } },
      }],
    }) } }));
    await sns.send(new SubscribeCommand({
      TopicArn: topicArn, Protocol: 'sqs', Endpoint: queueArn,
      Attributes: {
        FilterPolicy: JSON.stringify({ status: [status] }), FilterPolicyScope: 'MessageAttributes',
        RawMessageDelivery: 'true',
      },
    }));
  }
  return {
    topicArn, queues, sqs,
    environment: {
      SNS_TOPIC_ARN: topicArn, AWS_ENDPOINT_URL: endpoint, AWS_REGION: region,
      AWS_ACCESS_KEY_ID: 'test', AWS_SECRET_ACCESS_KEY: 'test', SNS_PUBLISH_TIMEOUT_MS: '2000',
    },
    async deleteTopic() {
      await sns.send(new DeleteTopicCommand({ TopicArn: topicArn }));
      deleted = true;
    },
  };
}

void test('SNS entrega cada estado somente à sua SQS após commit, sem publicar replay/rollback', {
  timeout: 120000,
}, async (t) => {
  const transport = await messaging(t);
  const { app, migrations, request, property } = await fixture(t, transport.environment);
  const repository = app.get(ProposalRepository);
  const publisher = app.get(ProposalStatusPublisher);
  const send = publisher.publish.bind(publisher);
  const duration = t.mock.method(transactionDuration, 'record');
  let lastDurationCount = 0;
  const publish = t.mock.method(publisher, 'publish', async (proposal: Proposal) => {
    const committed = await repository.findById(proposal.id);
    assert.equal(committed?.status, proposal.status, 'Estado deve estar visível em outra conexão.');
    assert.equal(committed?.statusEnteredAt.toISOString(), proposal.statusEnteredAt);
    assert.ok(duration.mock.callCount() > lastDurationCount, 'Duração transacional registrada antes do SNS.');
    lastDurationCount = duration.mock.callCount();
    await send(proposal);
  });
  const expected = new Map<string, Omit<ProposalStatusChangedEvent, 'type'> & { type: string }>();
  function expectEvent(proposal: Proposal) {
    const eventId = `ProposalStatusChanged:${proposal.id}:${proposal.status}`;
    expected.set(eventId, {
      eventId, type: 'ProposalStatusChanged', schemaVersion: 1,
      occurredAt: proposal.statusEnteredAt, proposalId: proposal.id,
      customerId: proposal.customerId, propertyId: proposal.propertyId, status: proposal.status,
    });
  }
  const one = await property();
  const input = { customerId: one.customer.id, propertyId: one.property.id };
  const key = randomUUID();
  const created = await request<CreatedProposal>('POST', '/proposals', input, key);
  assert.equal(created.status, 201);
  expectEvent(created.body);
  for (const status of ['ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO', 'ATIVO']) {
    const response = await request<Proposal>('PATCH', `/proposals/${created.body.id}/status`, { status });
    assert.equal(response.status, 200);
    expectEvent(response.body);
  }
  for (const status of ['CANCELADA', 'REPROVADA']) {
    const another = await property();
    const result = await request<CreatedProposal>('POST', '/proposals', {
      customerId: another.customer.id, propertyId: another.property.id,
    }, randomUUID());
    assert.equal(result.status, 201);
    expectEvent(result.body);
    const response = await request<Proposal>('PATCH', `/proposals/${result.body.id}/status`, { status });
    assert.equal(response.status, 200);
    expectEvent(response.body);
  }
  await t.test('replay e transição rejeitada não invocam SNS', async () => {
    const before = publish.mock.callCount();
    const replay = await request<CreatedProposal>('POST', '/proposals', input, key);
    assert.equal(replay.status, 201);
    assert.deepEqual(replay.body, created.body);
    assert.equal((await request('PATCH', `/proposals/${created.body.id}/status`, { status: 'ATIVO' })).status, 409);
    assert.equal(publish.mock.callCount(), before);
  });
  await t.test('falha após reserva reverte criação e não invoca SNS', async () => {
    const another = await property();
    const before = publish.mock.callCount();
    const failedKey = randomUUID();
    assert.equal((await request('POST', '/proposals', {
      customerId: randomUUID(), propertyId: another.property.id,
    }, failedKey)).status, 404);
    assert.equal(
      (await request<PropertyResponse>('GET', `/properties/${another.property.id}`)).body.status, 'DISPONIVEL',
    );
    const [saved] = await namedQuery<Array<{ total: string }>>(migrations.manager, `
      SELECT count(*) AS total FROM proposal.idempotency_requests WHERE key = :key
    `, { key: failedKey });
    assert.equal(saved?.total, '0');
    assert.equal(publish.mock.callCount(), before);
  });
  await t.test('rollback de alteração não invoca SNS', async () => {
    const another = await property();
    const result = await request<CreatedProposal>('POST', '/proposals', {
      customerId: another.customer.id, propertyId: another.property.id,
    }, randomUUID());
    assert.equal(result.status, 201);
    expectEvent(result.body);
    for (const status of ['ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO']) {
      const response = await request<Proposal>('PATCH', `/proposals/${result.body.id}/status`, { status });
      assert.equal(response.status, 200);
      expectEvent(response.body);
    }
    const before = publish.mock.callCount();
    const name = 'fail_' + randomUUID().replace(/-/g, '');
    await migrations.query(`CREATE FUNCTION property.${name}() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.status='ALUGADO' THEN RAISE EXCEPTION 'forced test failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER ${name} BEFORE UPDATE ON property.properties FOR EACH ROW EXECUTE FUNCTION property.${name}()`);
    try {
      assert.equal((await request('PATCH', `/proposals/${result.body.id}/status`, { status: 'ATIVO' })).status, 500);
      assert.equal((await request<Proposal>('GET', `/proposals/${result.body.id}`)).body.status, 'ASSINADO');
      assert.equal(publish.mock.callCount(), before);
    } finally {
      await migrations.query(`DROP TRIGGER ${name} ON property.properties; DROP FUNCTION property.${name}()`);
    }
  });
  await t.test('sete filtros SQS entregam o contrato completo e somente seu status', async () => {
    const received = new Set<string>();
    for (let round = 0; round < 10; round++) {
      await Promise.all([...transport.queues].map(async ([status, QueueUrl]) => {
        const response = await transport.sqs.send(new ReceiveMessageCommand({
          QueueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 1, MessageAttributeNames: ['All'],
        }));
        for (const message of response.Messages ?? []) {
          assert.ok(message.Body);
          const event = JSON.parse(message.Body) as ProposalStatusChangedEvent;
          assert.equal(event.status, status, 'Mensagem não deve vazar para a fila de outro estado.');
          assert.deepEqual(message.MessageAttributes?.status, { DataType: 'String', StringValue: status });
          assert.deepEqual(event, expected.get(event.eventId));
          received.add(event.eventId);
          await transport.sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: message.ReceiptHandle }));
        }
      }));
      if (received.size === expected.size && round >= 2) break;
    }
    assert.deepEqual([...received].sort(), [...expected.keys()].sort());
    assert.equal(publish.mock.callCount(), expected.size);
  });
  await t.test('falha SNS não muda criação, replay, alteração ou estado confirmado', async (caseContext) => {
    await transport.deleteTopic();
    const failures = caseContext.mock.method(publicationFailures, 'add');
    const errors = caseContext.mock.method(Logger.prototype, 'error', () => {});
    const another = await property();
    const newInput = { customerId: another.customer.id, propertyId: another.property.id };
    const newKey = randomUUID();
    const result = await request<CreatedProposal>('POST', '/proposals', newInput, newKey);
    assert.equal(result.status, 201);
    assert.equal((await request<Proposal>('GET', `/proposals/${result.body.id}`)).body.status, 'NOVA');
    const replay = await request<CreatedProposal>('POST', '/proposals', newInput, newKey);
    assert.equal(replay.status, 201);
    assert.deepEqual(replay.body, result.body);
    const cancelled = await request<Proposal>('PATCH', `/proposals/${result.body.id}/status`, { status: 'CANCELADA' });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'CANCELADA');
    assert.equal((await request<Proposal>('GET', `/proposals/${result.body.id}`)).body.status, 'CANCELADA');
    assert.equal(
      (await request<PropertyResponse>('GET', `/properties/${another.property.id}`)).body.status, 'DISPONIVEL',
    );
    assert.equal(failures.mock.callCount(), 2);
    assert.deepEqual(failures.mock.calls.map((call) => call.arguments), [
      [1, { status: 'NOVA' }], [1, { status: 'CANCELADA' }],
    ]);
    assert.equal(errors.mock.callCount(), 2);
    assert.deepEqual(errors.mock.calls[0]?.arguments, [{
      code: 'PROPOSAL_STATUS_PUBLICATION_FAILED', proposalId: result.body.id, status: 'NOVA',
    }]);
  });
});
