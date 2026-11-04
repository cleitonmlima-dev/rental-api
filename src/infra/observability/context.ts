import { isSpanContextValid, trace } from '@opentelemetry/api';

export function traceContext() {
  const span = trace.getActiveSpan()?.spanContext();
  return span && isSpanContextValid(span) ? span : undefined;
}
