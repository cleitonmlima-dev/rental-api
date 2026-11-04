import { metrics, type Attributes } from '@opentelemetry/api';
import type { NextFunction, Request, Response } from 'express';

const meter = metrics.getMeter('rental-pipeline');
const counter = (name: string) => {
  const instrument = meter.createCounter(name);
  return { add: (value: number, attributes?: Attributes) => instrument.add(value, attributes) };
};
const histogram = (name: string, unit: string) => {
  const instrument = meter.createHistogram(name, { unit });
  return { record: (value: number, attributes?: Attributes) => instrument.record(value, attributes) };
};

export const transactionCount = counter('rental_transactions');
export const transactionDuration = histogram('rental_transaction_duration_seconds', 's');
export const proposalOutcomes = counter('rental_proposal_outcomes');
export const publicationFailures = counter('rental_publication_failures');
export const businessConflicts = counter('rental_business_conflicts');
const httpCount = counter('rental_http_requests');
const httpDuration = histogram('rental_http_duration_seconds', 's');

export function httpMetrics(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  res.once('finish', () => {
    const method = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'].includes(req.method)
      ? req.method : 'OTHER';
    const labels = {
      method, route: typeof req.route?.path === 'string' ? req.route.path : 'unmatched', status: String(res.statusCode),
    };
    httpCount.add(1, labels);
    httpDuration.record((performance.now() - start) / 1000, labels);
  });
  next();
}
