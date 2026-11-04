import { metrics } from '@opentelemetry/api';
import type { NextFunction, Request, Response } from 'express';

const meter = metrics.getMeter('rental-pipeline');
export const transactionCount = meter.createCounter('rental_transactions');
export const transactionDuration = meter.createHistogram('rental_transaction_duration_seconds', { unit: 's' });
export const proposalOutcomes = meter.createCounter('rental_proposal_outcomes');
export const publicationFailures = meter.createCounter('rental_publication_failures');
export const businessConflicts = meter.createCounter('rental_business_conflicts');
const httpCount = meter.createCounter('rental_http_requests');
const httpDuration = meter.createHistogram('rental_http_duration_seconds', { unit: 's' });

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
