"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TaskCard } from "./task-card";
import type { Task } from "@/types";

interface SortableTaskCardProps {
  task: Task;
  onComplete: (
    id: number,
    notes?: string,
    resultData?: Record<string, unknown>,
  ) => Promise<void>;
  onFail: (id: number, notes?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isLoading?: boolean;
}

export function SortableTaskCard({
  task,
  onComplete,
  onFail,
  onDelete,
  isLoading,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    scale: isDragging ? 0.98 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex gap-2">
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="mt-4 flex shrink-0 cursor-grab touch-none items-start text-muted-foreground hover:text-foreground active:cursor-grabbing"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-5" />
      </button>

      {/* Card */}
      <div className="min-w-0 flex-1">
        <TaskCard
          task={task}
          onComplete={onComplete}
          onFail={onFail}
          onDelete={onDelete}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
