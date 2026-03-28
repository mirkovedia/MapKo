"use client";

import { useEffect, useState, useRef, useCallback } from "react";

/**
 * Simple client-side cache for API responses.
 * Shows cached data instantly on mount, then silently revalidates.
 */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const STALE_TIME = 30_000; // 30 seconds before background revalidation

export function useCachedFetch<T>(
  url: string | null,
  opts?: { transform?: (data: unknown) => T }
) {
  const cached = url ? cache.get(url) : undefined;
  const [data, setData] = useState<T | null>(
    cached ? (cached.data as T) : null
  );
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      const raw = await res.json();
      const transformed = opts?.transform ? opts.transform(raw) : (raw as T);
      cache.set(url, { data: transformed, timestamp: Date.now() });
      if (mountedRef.current) {
        setData(transformed);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Fetch failed");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url, opts?.transform]);

  useEffect(() => {
    mountedRef.current = true;
    if (!url) {
      setLoading(false);
      return;
    }

    const entry = cache.get(url);
    if (entry) {
      setData(entry.data as T);
      setLoading(false);
      // Background revalidate if stale
      if (Date.now() - entry.timestamp > STALE_TIME) {
        refetch();
      }
    } else {
      setLoading(true);
      refetch();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [url, refetch]);

  return { data, loading, error, refetch };
}

/** Invalidate a cached URL so the next mount fetches fresh data */
export function invalidateCache(url: string) {
  cache.delete(url);
}

/** Invalidate all cached data matching a prefix */
export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
