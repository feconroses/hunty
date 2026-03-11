"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { FilterRule } from "@/types";
import {
  getFilters,
  createFilter as apiCreateFilter,
  updateFilter as apiUpdateFilter,
  deleteFilter as apiDeleteFilter,
  getFilterPrompt as apiGetFilterPrompt,
} from "@/lib/api";

export function useFilters() {
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFilters();
      setFilters(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load filters";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFilter = useCallback(
    async (data: Partial<FilterRule>) => {
      const filter = await apiCreateFilter(data);
      await fetchFilters();
      return filter;
    },
    [fetchFilters],
  );

  const updateFilter = useCallback(
    async (id: number, data: Partial<FilterRule>) => {
      const filter = await apiUpdateFilter(id, data);
      await fetchFilters();
      return filter;
    },
    [fetchFilters],
  );

  const deleteFilter = useCallback(
    async (id: number) => {
      await apiDeleteFilter(id);
      await fetchFilters();
    },
    [fetchFilters],
  );

  const getPrompt = useCallback(async (companyId: number | string) => {
    return apiGetFilterPrompt(companyId);
  }, []);

  const generalFilters = useMemo(
    () => filters.filter((f) => f.company_id === null),
    [filters],
  );

  const companyFilters = useMemo(() => {
    const grouped: Record<string, FilterRule[]> = {};
    for (const f of filters) {
      if (f.company_id !== null) {
        if (!grouped[f.company_id]) {
          grouped[f.company_id] = [];
        }
        grouped[f.company_id].push(f);
      }
    }
    return grouped;
  }, [filters]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  return {
    filters,
    loading,
    error,
    generalFilters,
    companyFilters,
    createFilter,
    updateFilter,
    deleteFilter,
    getFilterPrompt: getPrompt,
    refetch: fetchFilters,
  };
}
