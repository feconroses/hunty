"use client";

import { useState, useEffect, useCallback } from "react";
import type { LinkedInSearch } from "@/types";
import {
  getLinkedinSearches,
  createLinkedinSearch,
  updateLinkedinSearch as apiUpdateSearch,
  deleteLinkedinSearch as apiDeleteSearch,
  triggerLinkedinScan as apiTriggerScan,
} from "@/lib/api";

export function useLinkedinSearches() {
  const [searches, setSearches] = useState<LinkedInSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSearches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLinkedinSearches();
      setSearches(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load LinkedIn searches";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addSearch = useCallback(
    async (data: Partial<LinkedInSearch>) => {
      const search = await createLinkedinSearch(data);
      await fetchSearches();
      return search;
    },
    [fetchSearches],
  );

  const updateSearch = useCallback(
    async (id: number, data: Partial<LinkedInSearch>) => {
      const search = await apiUpdateSearch(id, data);
      await fetchSearches();
      return search;
    },
    [fetchSearches],
  );

  const deleteSearch = useCallback(
    async (id: number) => {
      await apiDeleteSearch(id);
      await fetchSearches();
    },
    [fetchSearches],
  );

  const triggerScan = useCallback(
    async (id: number) => {
      const task = await apiTriggerScan(id);
      await fetchSearches();
      return task;
    },
    [fetchSearches],
  );

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  return {
    searches,
    loading,
    error,
    addSearch,
    updateSearch,
    deleteSearch,
    triggerScan,
    refetch: fetchSearches,
  };
}
