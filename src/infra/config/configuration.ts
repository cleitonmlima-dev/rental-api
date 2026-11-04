import type { AppConfig } from './interfaces/app-config.interface';

export const APP_CONFIG = Symbol('APP_CONFIG');

export class ConfigurationError extends Error {
  constructor(key: string, requirement: string) {
    super(`Configuração inválida: ${key} ${requirement}.`);
    this.name = 'ConfigurationError';
  }
}

function integer(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  max = 2_147_483_647,
): number {
  const raw = env[key] ?? String(fallback);
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new ConfigurationError(key, `deve ser um inteiro entre 1 e ${max}`);
  }
  return value;
}

function requiredUrl(
  env: NodeJS.ProcessEnv,
  key: string,
  protocols: readonly string[],
): string {
  const raw = env[key];
  if (!raw) throw new ConfigurationError(key, 'é obrigatória');
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ConfigurationError(key, 'deve ser uma URL válida');
  }
  if (!protocols.includes(parsed.protocol) || !parsed.hostname) {
    throw new ConfigurationError(key, `deve usar ${protocols.join(' ou ')}`);
  }
  return raw;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new ConfigurationError('NODE_ENV', 'deve ser development, test ou production');
  }

  const databaseUrl = requiredUrl(env, 'DATABASE_URL', ['postgres:', 'postgresql:']);
  const awsRegion = env.AWS_REGION ?? 'us-east-1';
  const snsTopicArn = env.SNS_TOPIC_ARN;
  if (!snsTopicArn) throw new ConfigurationError('SNS_TOPIC_ARN', 'é obrigatória');
  const topic = /^arn:(aws|aws-cn|aws-us-gov):sns:([a-z0-9-]+):\d{12}:[A-Za-z0-9_-]{1,256}$/.exec(snsTopicArn);
  if (!topic || topic[2] !== awsRegion) {
    throw new ConfigurationError('SNS_TOPIC_ARN', 'deve ser um ARN SNS standard na AWS_REGION configurada');
  }

  const config: AppConfig = {
    nodeEnv,
    port: integer(env, 'PORT', 3000, 65535),
    databaseUrl,
    dbConnectTimeoutMs: integer(env, 'DB_CONNECT_TIMEOUT_MS', 1000),
    dbLockTimeoutMs: integer(env, 'DB_LOCK_TIMEOUT_MS', 1000),
    dbStatementTimeoutMs: integer(env, 'DB_STATEMENT_TIMEOUT_MS', 3000),
    dbOperationTimeoutMs: integer(env, 'DB_OPERATION_TIMEOUT_MS', 5000),
    awsRegion,
    awsEndpoint: env.AWS_ENDPOINT_URL === undefined
      ? undefined : requiredUrl(env, 'AWS_ENDPOINT_URL', ['http:', 'https:']),
    snsTopicArn,
    snsPublishTimeoutMs: integer(env, 'SNS_PUBLISH_TIMEOUT_MS', 2000),
  };

  if (config.dbStatementTimeoutMs < config.dbLockTimeoutMs) {
    throw new ConfigurationError('DB_STATEMENT_TIMEOUT_MS', 'deve ser >= DB_LOCK_TIMEOUT_MS');
  }
  if (config.dbOperationTimeoutMs <= config.dbStatementTimeoutMs) {
    throw new ConfigurationError('DB_OPERATION_TIMEOUT_MS', 'deve ser > DB_STATEMENT_TIMEOUT_MS');
  }
  return Object.freeze(config);
}

export function loadMigrationConfig(env: NodeJS.ProcessEnv): AppConfig {
  const databaseUrl = requiredUrl(env, 'MIGRATION_DATABASE_URL', ['postgres:', 'postgresql:']);
  return loadConfig({ ...env, DATABASE_URL: databaseUrl });
}
