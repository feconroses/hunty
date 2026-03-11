"use client";

import { useState, useEffect, useCallback } from "react";
import type { ActivityLogEntry } from "@/types";
import { getActivityLog } from "@/lib/api";

interface ActivityFilters {
  entity_type?: string;
}

const PAGE_SIZE = 20;

export function useActivity() {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<ActivityFilters>({});

  const fetchActivities = useCallback(
    async (currentOffset: number, currentFilters: ActivityFilters, append: boolean) => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, unknown> = {
          limit: PAGE_SIZE,
          offset: currentOffset,
        };

        if (currentFilters.entity_type) {
          params.entity_type = currentFilters.entity_type;
        }

        const data = await getActivityLog(params);

        if (append) {
          setActivities((prev) => [...prev, ...data.items]);
        } else {
          setActivities(data.items);
        }

        setTotal(data.total);
        setHasMore(currentOffset + data.items.length < data.total);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch activity log";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchActivities(nextOffset, filters, true);
  }, [offset, filters, fetchActivities]);

  const updateFilters = useCallback(
    (newFilters: ActivityFilters) => {
      setFilters(newFilters);
      setOffset(0);
      setActivities([]);
      fetchActivities(0, newFilters, false);
    },
    [fetchActivities]
  );

  useEffect(() => {
    fetchActivities(0, filters, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    activities,
    loading,
    error,
    hasMore,
    total,
    filters,
    loadMore,
    updateFilters,
  };
}
