"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Task, CreateTaskRequest, CompleteTaskRequest, TaskQueue } from "@/types";
import * as api from "@/lib/api";

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  todayTasks: Task[];
  queueTasks: Task[];
  scheduledTasks: Task[];
  fetchTasks: () => Promise<void>;
  createTask: (data: CreateTaskRequest) => Promise<Task>;
  completeTask: (id: number, notes?: string, resultData?: Record<string, unknown>) => Promise<Task>;
  failTask: (id: number, notes?: string) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  reorderTasks: (items: { id: number; queue_order: number }[]) => Promise<void>;
  bulkMoveTasks: (taskIds: number[], targetQueue: TaskQueue) => Promise<void>;
  autoFillToday: () => Promise<void>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTasks();
      setTasks(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch tasks";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (data: CreateTaskRequest): Promise<Task> => {
    const task = await api.createTask(data);
    setTasks((prev) => [...prev, task]);
    return task;
  }, []);

  const completeTask = useCallback(
    async (id: number, notes?: string, resultData?: Record<string, unknown>): Promise<Task> => {
      const payload: CompleteTaskRequest = {};
      if (notes) payload.notes = notes;
      if (resultData) payload.result_data = resultData;
      const updated = await api.completeTask(id, payload);
      // Refetch to pick up child tasks created by chain logic
      const allTasks = await api.getTasks();
      setTasks(allTasks);
      return updated;
    },
    [],
  );

  const failTask = useCallback(async (id: number, notes?: string): Promise<Task> => {
    const updated = await api.failTask(id, notes ? { notes } : undefined);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const deleteTask = useCallback(async (id: number): Promise<void> => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const reorderTasks = useCallback(
    async (items: { id: number; queue_order: number }[]) => {
      await api.reorderTasks(items);
    },
    [],
  );

  const bulkMoveTasks = useCallback(
    async (taskIds: number[], targetQueue: TaskQueue) => {
      await api.bulkMoveTasks({ task_ids: taskIds, target_queue: targetQueue });
      setTasks((prev) =>
        prev.map((t) =>
          taskIds.includes(t.id) ? { ...t, queue: targetQueue } : t,
        ),
      );
    },
    [],
  );

  const autoFillToday = useCallback(async () => {
    try {
      const filled = await api.autoFillToday();
      // Merge filled tasks into state, replacing existing or adding new
      setTasks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        for (const task of filled) {
          map.set(task.id, task);
        }
        return Array.from(map.values());
      });
    } catch {
      // Auto-fill is best-effort; don't block the UI
    }
  }, []);

  // Computed task lists: filter by queue and only show pending tasks
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.queue === "today" && t.status === "pending")
        .sort((a, b) => a.queue_order - b.queue_order),
    [tasks],
  );

  const queueTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.queue === "queue" && t.status === "pending")
        .sort((a, b) => a.queue_order - b.queue_order),
    [tasks],
  );

  const scheduledTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.queue === "scheduled" && t.status === "pending")
        .sort((a, b) => a.queue_order - b.queue_order),
    [tasks],
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    todayTasks,
    queueTasks,
    scheduledTasks,
    fetchTasks,
    createTask,
    completeTask,
    failTask,
    deleteTask,
    reorderTasks,
    bulkMoveTasks,
    autoFillToday,
    setTasks,
  };
}
