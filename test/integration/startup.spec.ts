import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'node:test';

const execute = promisify(execFile);

void test('processo falha se PostgreSQL não estiver disponível', { timeout: 20000 }, async () => {
  await assert.rejects(() => execute(process.execPath, ['--require', 'ts-node/register', 'src/main.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://rental_app:never-log-this@127.0.0.1:1/rental',
      SNS_TOPIC_ARN: 'arn:aws:sns:us-east-1:000000000000:rental-proposal-status',
      DB_CONNECT_TIMEOUT_MS: '250',
    },
    timeout: 15000,
    maxBuffer: 100000,
  }), (error: unknown) => {
    assert.ok(error instanceof Error);
    const failure = error as Error & { code?: number; killed?: boolean; stdout?: string; stderr?: string };
    assert.equal(failure.code, 1);
    assert.notEqual(failure.killed, true);
    const output = `${failure.stdout ?? ''}${failure.stderr ?? ''}`;
    assert.match(output, /Falha ao iniciar a aplicação/);
    assert.ok(!output.includes('never-log-this'));
    return true;
  });
});
