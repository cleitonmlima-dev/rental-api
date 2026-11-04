import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.API_URL ?? 'http://127.0.0.1:3000';

async function request(method, path, input, key) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    body: input === undefined ? undefined : JSON.stringify(input),
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(response.ok, `${method} ${path}: HTTP ${response.status}`);
  return response.json();
}

const unique = randomUUID();
const customer = await request('POST', '/customers', {
  name: 'Cliente demonstração',
  cpf: BigInt('0x' + unique.replaceAll('-', '')).toString(),
  email: `${unique}@example.com`,
});
const property = await request('POST', '/properties', {
  ownerId: customer.id, address: 'Rua de demonstração, 100', type: 'APARTAMENTO',
});
const input = { customerId: customer.id, propertyId: property.id };
const key = randomUUID();
const first = await request('POST', '/proposals', input, key);
assert.deepEqual(await request('POST', '/proposals', input, key), first);
await request('PATCH', `/proposals/${first.id}/status`, { status: 'CANCELADA' });
assert.deepEqual(await request('POST', '/proposals', input, key), first);
const second = await request('POST', '/proposals', input, randomUUID());
for (const status of ['ANALISE_CREDITO', 'CONTRATO_EMITIDO', 'ASSINADO', 'ATIVO']) {
  const updated = await request('PATCH', `/proposals/${second.id}/status`, { status });
  assert.equal(updated.status, status);
}
assert.equal((await request('GET', `/properties/${property.id}`)).status, 'ALUGADO');
assert.equal((await request('GET', `/proposals/${second.id}/history`)).meta.total, 5);
console.log(JSON.stringify({
  customerId: customer.id,
  propertyId: property.id,
  canceledProposalId: first.id,
  activeProposalId: second.id,
}, null, 2));
