import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function requestIdMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  res.setHeader('X-Request-Id', requestId);
  requestContext.run({ requestId }, next);
}
