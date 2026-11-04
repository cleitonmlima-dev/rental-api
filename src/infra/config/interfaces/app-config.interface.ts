export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly port: number;
  readonly databaseUrl: string;
  readonly dbConnectTimeoutMs: number;
  readonly dbLockTimeoutMs: number;
  readonly dbStatementTimeoutMs: number;
  readonly dbOperationTimeoutMs: number;
  readonly awsRegion: string;
  readonly awsEndpoint: string | undefined;
  readonly snsTopicArn: string;
  readonly snsPublishTimeoutMs: number;
}
