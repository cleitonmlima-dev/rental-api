import type { LoggerService } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { requestContext } from '../../shared/http/request-context';
import { traceContext } from './context';

export class AppLogger implements LoggerService {
  log(message: unknown, context?: string): void { this.write('info', message, context); }
  warn(message: unknown, context?: string): void { this.write('warn', message, context); }
  error(message: unknown, stackOrContext?: string, context?: string): void {
    this.write('error', message, context ?? stackOrContext);
  }
  debug(message: unknown, context?: string): void { this.write('debug', message, context); }
  verbose(message: unknown, context?: string): void { this.write('debug', message, context); }
  fatal(message: unknown, context?: string): void { this.write('error', message, context); }

  private write(level: 'info' | 'warn' | 'error' | 'debug', message: unknown, context?: string): void {
    const span = traceContext();
    const requestId = requestContext.getStore()?.requestId;
    const fields = message instanceof Error ? { message: message.message, stack: message.stack }
      : typeof message === 'object' && message !== null ? message : { message: String(message) };
    const record = {
      timestamp: new Date().toISOString(), level, service: 'rental-pipeline-api', context,
      ...fields, requestId, traceId: span?.traceId, spanId: span?.spanId,
    };
    const body = JSON.stringify(record);
    console.log(body);
    logs.getLogger('rental').emit({
      severityNumber: {
        info: SeverityNumber.INFO, warn: SeverityNumber.WARN,
        error: SeverityNumber.ERROR, debug: SeverityNumber.DEBUG,
      }[level],
      severityText: level.toUpperCase(), body,
    });
  }
}
