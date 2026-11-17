import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

interface TenantStore {
  companyId?: number;
}

/**
 * Holds the company the current request (or script) works for.
 *
 * Every repository of tenant-owned data reads `companyId` from here and filters by it.
 * Reading it without a bound company throws, so a missing binding fails closed instead of
 * leaking another company's rows.
 */
@Injectable()
export class TenantContext {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  /** Express middleware that opens an empty store per request. The auth guard fills it in. */
  middleware() {
    return (_request: Request, _response: Response, next: NextFunction): void => {
      this.storage.run({}, next);
    };
  }

  /** Binds the company for the rest of the current request. */
  bind(companyId: number): void {
    const store = this.storage.getStore();
    if (!store) throw new Error('Tenant context is not available outside a request');
    store.companyId = companyId;
  }

  /** Runs `work` for a company outside an HTTP request (scripts, tests). */
  run<T>(companyId: number, work: () => T): T {
    return this.storage.run({ companyId }, work);
  }

  get companyId(): number {
    const companyId = this.storage.getStore()?.companyId;
    if (companyId === undefined) {
      throw new Error('No company bound to this operation; refusing to query tenant data');
    }
    return companyId;
  }
}
