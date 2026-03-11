"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Job } from "@/types";
import {
  getJobs,
  updateJob as apiUpdateJob,
  deleteJob as apiDeleteJob,
  reorderJobs as apiReorderJobs,
} from "@/lib/api";

export interface JobFilters {
  company?: string;
  location?: string;
  work_type?: string;
  seniority?: string;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>({});
  const abortRef = useRef<AbortController | null>(null);

  const fetchJobs = useCallback(async (appliedFilters?: JobFilters) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params: Record<string, unknown> = {};
      const f = appliedFilters ?? {};

      if (f.company) params.company_id = f.company;
      if (f.location) params.location = f.location;
      if (f.work_type) params.work_type = f.work_type;
      if (f.seniority) params.seniority_level = f.seniority;

      const data = await getJobs(params);
      setJobs(data.items);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message =
        err instanceof Error ? err.message : "Failed to fetch jobs";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateJob = useCallback(
    async (id: number, data: Partial<Job>) => {
      const updated = await apiUpdateJob(id, data);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      return updated;
    },
    []
  );

  const deleteJob = useCallback(async (id: number) => {
    await apiDeleteJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const reorderJobs = useCallback(
    async (
      items: { id: number; kanban_stage_id: number; kanban_order: number }[]
    ) => {
      await apiReorderJobs(items);
    },
    []
  );

  const moveJob = useCallback(
    async (jobId: number, newStageId: number, newOrder: number) => {
      // Optimistic update
      setJobs((prev) => {
        const updated = prev.map((j) => {
          if (j.id === jobId) {
            return { ...j, kanban_stage_id: newStageId, kanban_order: newOrder };
          }
          return j;
        });

        // Recalculate orders within the target stage
        const stageJobs = updated
          .filter(
            (j) => j.kanban_stage_id === newStageId && j.id !== jobId
          )
          .sort((a, b) => a.kanban_order - b.kanban_order);

        // Insert at the correct position
        const movedJob = updated.find((j) => j.id === jobId);
        if (!movedJob) return updated;

        stageJobs.splice(newOrder, 0, movedJob);

        // Reassign orders for the target stage
        const reordered = stageJobs.map((j, idx) => ({
          ...j,
          kanban_order: idx,
        }));

        return updated.map((j) => {
          const reorderedJob = reordered.find((r) => r.id === j.id);
          return reorderedJob ?? j;
        });
      });

      // Persist to backend
      try {
        await apiUpdateJob(jobId, {
          kanban_stage_id: newStageId,
          kanban_order: newOrder,
        });
      } catch {
        // Revert on failure by re-fetching
        await fetchJobs(filters);
      }
    },
    [fetchJobs, filters]
  );

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchJobs(filters);
  }, [fetchJobs, filters]);

  return {
    jobs,
    loading,
    error,
    filters,
    setFilters,
    fetchJobs,
    updateJob,
    deleteJob,
    reorderJobs,
    moveJob,
  };
}
