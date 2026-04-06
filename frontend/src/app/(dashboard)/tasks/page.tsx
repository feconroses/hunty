"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ClaudePromptBox } from "@/components/tasks/claude-prompt-box";
import { TaskQueueTabs } from "@/components/tasks/task-queue-tabs";
import { useTasks } from "@/hooks/use-tasks";
import type { Task, TaskQueue } from "@/types";

function TasksSkeleton() {
  return (
    <div className="space-y-4">
      {/* Tabs skeleton */}
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-8 w-24 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
      {/* Cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl border border-border bg-muted/30"
        />
      ))}
    </div>
  );
}

export default function TasksPage() {
  const {
    loading,
    error,
    todayTasks,
    queueTasks,
    scheduledTasks,
    completedTasks,
    completeTask,
    failTask,
    deleteTask,
    reorderTasks,
    autoFillToday,
    setTasks,
  } = useTasks();

  const autoFillRef = useRef(false);

  useEffect(() => {
    if (!loading && !autoFillRef.current) {
      autoFillRef.current = true;
      autoFillToday();
    }
  }, [loading, autoFillToday]);

  const handleComplete = useCallback(
    async (
      id: number,
      notes?: string,
      resultData?: Record<string, unknown>,
    ) => {
      try {
        await completeTask(id, notes, resultData);
        toast.success("Task completed successfully");
      } catch {
        toast.error("Failed to complete task");
      }
    },
    [completeTask],
  );

  const handleFail = useCallback(
    async (id: number, notes?: string) => {
      try {
        await failTask(id, notes);
        toast.success("Task marked as failed");
      } catch {
        toast.error("Failed to update task");
      }
    },
    [failTask],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteTask(id);
        toast.success("Task deleted");
      } catch {
        toast.error("Failed to delete task");
      }
    },
    [deleteTask],
  );

  const handleReorder = useCallback(
    async (items: { id: number; queue_order: number }[]) => {
      try {
        await reorderTasks(items);
      } catch {
        toast.error("Failed to reorder tasks");
      }
    },
    [reorderTasks],
  );

  // Optimistic reorder: update task order in local state immediately
  const handleTasksReordered = useCallback(
    (queue: TaskQueue, reordered: Task[]) => {
      setTasks((prev) => {
        const otherTasks = prev.filter((t) => t.queue !== queue || t.status !== "pending");
        const updatedReordered = reordered.map((t, i) => ({
          ...t,
          queue_order: i,
        }));
        return [...otherTasks, ...updatedReordered];
      });
    },
    [setTasks],
  );

  const totalPending = todayTasks.length + queueTasks.length + scheduledTasks.length;
  const subtitle = `${todayTasks.length} today \u00b7 ${queueTasks.length} queued \u00b7 ${scheduledTasks.length} scheduled`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle={subtitle}
      />

      <ClaudePromptBox />

      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <TasksSkeleton />
      ) : (
        <TaskQueueTabs
          todayTasks={todayTasks}
          queueTasks={queueTasks}
          scheduledTasks={scheduledTasks}
          completedTasks={completedTasks}
          onComplete={handleComplete}
          onFail={handleFail}
          onDelete={handleDelete}
          onReorder={handleReorder}
          onTasksReordered={handleTasksReordered}
          isLoading={false}
        />
      )}
    </div>
  );
}
