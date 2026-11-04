import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader, AggregationType } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { telemetryLifecycle } from './lifecycle';

if (process.env.OTEL_SDK_DISABLED !== 'true') {
  try {
    const queues = {
      maxQueueSize: 512, maxExportBatchSize: 128,
      scheduledDelayMillis: 1000, exportTimeoutMillis: 1000,
    };
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        'service.name': 'rental-pipeline-api',
        'deployment.environment.name': process.env.NODE_ENV ?? 'development',
      }),
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ timeoutMillis: 1000 }), queues)],
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ timeoutMillis: 1000 }),
        exportIntervalMillis: 5000, exportTimeoutMillis: 1000,
      }),
      logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter({ timeoutMillis: 1000 }), queues)],
      views: [{
        instrumentName: '*duration_seconds',
        aggregation: {
          type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
          options: { boundaries: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10] },
        },
      }],
      instrumentations: [new HttpInstrumentation(), new PgInstrumentation({ enhancedDatabaseReporting: false })],
    });
    sdk.start();
    telemetryLifecycle.shutdown = async () => {
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([sdk.shutdown(), new Promise<void>((resolve) => { timer = setTimeout(resolve, 2000); })]);
      } catch {
        console.warn(JSON.stringify({ level: 'warn', message: 'TELEMETRY_SHUTDOWN_FAILED' }));
      } finally {
        clearTimeout(timer);
      }
    };
  } catch {
    console.warn(JSON.stringify({ level: 'warn', message: 'TELEMETRY_START_FAILED' }));
  }
}
