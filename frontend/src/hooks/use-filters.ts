"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { FilterRule } from "@/types";
import {
  getFilters,
  createFilter as apiCreateFilter,
  updateFilter as apiUpdateFilter,
  deleteFilter as apiDeleteFilter,
  getFilterPrompt as apiGetFilterPrompt,
  getSectionOrder as apiGetSectionOrder,
  updateSectionOrder as apiUpdateSectionOrder,
} from "@/lib/api";

export const DEFAULT_SECTION_ORDER = [
  "title_include",
  "title_exclude",
  "description_include",
  "location",
  "seniority",
  "work_type",
  "min_salary",
  "free_text",
];

export function useFilters() {
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sectionOrder, setSectionOrder] =
    useState<string[]>(DEFAULT_SECTION_ORDER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, order] = await Promise.all([
        getFilters(),
        apiGetSectionOrder(),
      ]);
      setFilters(data);
      setSectionOrder(order);
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
      setFilters((prev) => [...prev, filter]);
      return filter;
    },
    [],
  );

  const updateFilter = useCallback(
    async (id: number, data: Partial<FilterRule>) => {
      const filter = await apiUpdateFilter(id, data);
      setFilters((prev) => prev.map((f) => (f.id === id ? filter : f)));
      return filter;
    },
    [],
  );

  const deleteFilter = useCallback(
    async (id: number) => {
      await apiDeleteFilter(id);
      setFilters((prev) => prev.filter((f) => f.id !== id));
    },
    [],
  );

  const reorderSections = useCallback(
    async (sections: string[]) => {
      setSectionOrder(sections); // optimistic update
      await apiUpdateSectionOrder(sections);
    },
    [],
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
    sectionOrder,
    generalFilters,
    companyFilters,
    createFilter,
    updateFilter,
    deleteFilter,
    reorderSections,
    getFilterPrompt: getPrompt,
    refetch: fetchFilters,
  };
}
