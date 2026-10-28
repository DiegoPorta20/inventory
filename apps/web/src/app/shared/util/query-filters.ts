import { computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

type Primitive = string | number | boolean;
type Defaults = Record<string, Primitive>;

export interface QueryFilters<T extends Defaults> {
  /** Current filter values parsed from the URL (defaults applied). */
  readonly value: Signal<T>;
  /** Merge a patch into the URL. Changing any filter other than `page` resets `page` to 1. */
  patch(change: Partial<T>): void;
  /** Remove every filter from the URL. */
  reset(): void;
  /** Number of filters that differ from their defaults, excluding page, pageSize and sorting keys. */
  readonly activeCount: Signal<number>;
}

const NON_FILTER_KEYS = new Set(['page', 'pageSize', 'sortBy', 'sortDirection']);

/**
 * Keeps list-page filters in the URL query string so views are shareable and survive refresh.
 * The type of each default (string | number | boolean) drives parsing.
 */
export function useQueryFilters<T extends Defaults>(defaults: T): QueryFilters<T> {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const params = toSignal(route.queryParamMap.pipe(map((p) => p)), { requireSync: true });

  const value = computed(() => {
    const result: Record<string, Primitive> = {};
    for (const [key, fallback] of Object.entries(defaults)) {
      const raw = params().get(key);
      if (raw === null || raw === '') {
        result[key] = fallback;
      } else if (typeof fallback === 'number') {
        const parsed = Number(raw);
        result[key] = Number.isFinite(parsed) ? parsed : fallback;
      } else if (typeof fallback === 'boolean') {
        result[key] = raw === 'true';
      } else {
        result[key] = raw;
      }
    }
    return result as T;
  });

  const navigate = (queryParams: Record<string, Primitive | null>) =>
    router.navigate([], {
      relativeTo: route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

  return {
    value,
    patch(change) {
      const queryParams: Record<string, Primitive | null> = {};
      for (const [key, next] of Object.entries(change) as [string, Primitive | undefined][]) {
        queryParams[key] =
          next === undefined || next === '' || next === defaults[key] ? null : next;
      }
      if (!('page' in change)) queryParams['page'] = null;
      void navigate(queryParams);
    },
    reset() {
      void navigate(Object.fromEntries(Object.keys(defaults).map((key) => [key, null])));
    },
    activeCount: computed(
      () =>
        Object.keys(defaults).filter(
          (key) => !NON_FILTER_KEYS.has(key) && value()[key] !== defaults[key],
        ).length,
    ),
  };
}
