"use client";

import { useState, useEffect, useCallback } from "react";
import type { KanbanStage } from "@/types";
import {
  getKanbanStages,
  createKanbanStage as apiCreateStage,
  updateKanbanStage as apiUpdateStage,
  deleteKanbanStage as apiDeleteStage,
  reorderKanbanStages as apiReorderStages,
} from "@/lib/api";

export function useKanbanStages() {
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getKanbanStages();
      setStages(data.sort((a, b) => a.order - b.order));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch stages";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStage = useCallback(
    async (data: Partial<KanbanStage>) => {
      const created = await apiCreateStage(data);
      setStages((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      return created;
    },
    []
  );

  const updateStage = useCallback(
    async (id: number, data: Partial<KanbanStage>) => {
      const updated = await apiUpdateStage(id, data);
      setStages((prev) =>
        prev
          .map((s) => (s.id === id ? updated : s))
          .sort((a, b) => a.order - b.order)
      );
      return updated;
    },
    []
  );

  const deleteStage = useCallback(async (id: number) => {
    await apiDeleteStage(id);
    setStages((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const reorderStages = useCallback(
    async (items: { id: number; order: number }[]) => {
      // Optimistic update
      setStages((prev) => {
        const map = new Map(items.map((i) => [i.id, i.order]));
        return prev
          .map((s) => {
            const newOrder = map.get(s.id);
            return newOrder !== undefined ? { ...s, order: newOrder } : s;
          })
          .sort((a, b) => a.order - b.order);
      });

      await apiReorderStages(items);
    },
    []
  );

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  return {
    stages,
    loading,
    error,
    fetchStages,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  };
}
