"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCorners,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { EnrichedJob, KanbanStage } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { KanbanColumn } from "./kanban-column";
import { JobCardOverlay } from "./job-card";

interface KanbanBoardProps {
  jobs: EnrichedJob[];
  stages: KanbanStage[];
  onMoveJob: (jobId: number, newStageId: number, newOrder: number) => void;
  onDeleteJob?: (id: number) => void;
  onClickJob?: (job: EnrichedJob) => void;
  loading?: boolean;
}

export function KanbanBoard({
  jobs,
  stages,
  onMoveJob,
  onDeleteJob,
  onClickJob,
  loading,
}: KanbanBoardProps) {
  const [activeJob, setActiveJob] = useState<EnrichedJob | null>(null);
  const [dragContainers, setDragContainers] = useState<Record<number, EnrichedJob[]> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  // Group jobs by stage (from props)
  const jobsByStage = useMemo(() => {
    const map: Record<number, EnrichedJob[]> = {};
    for (const stage of stages) {
      map[stage.id] = [];
    }
    for (const job of jobs) {
      if (job.kanban_stage_id != null && map[job.kanban_stage_id]) {
        map[job.kanban_stage_id].push(job);
      }
    }
    // Sort each column by kanban_order
    for (const key of Object.keys(map)) {
      map[Number(key)].sort((a, b) => a.kanban_order - b.kanban_order);
    }
    return map;
  }, [jobs, stages]);

  // Use drag-time state while dragging, otherwise use prop-derived state
  const activeJobsByStage = dragContainers ?? jobsByStage;

  // Find which container (stage) an id belongs to
  const findContainer = useCallback(
    (id: string | number): number | null => {
      const numId = Number(id);
      if (stages.some((s) => s.id === numId)) return numId;
      for (const [stageId, stageJobs] of Object.entries(activeJobsByStage)) {
        if (stageJobs.some((j) => j.id === numId)) return Number(stageId);
      }
      return null;
    },
    [stages, activeJobsByStage]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const job = jobs.find((j) => j.id === Number(active.id));
      if (job) {
        setActiveJob(job);
      }
    },
    [jobs]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeContainer = findContainer(active.id);
      const overContainer = findContainer(over.id);

      if (!activeContainer || !overContainer || activeContainer === overContainer) return;

      setDragContainers((prev) => {
        const current: Record<number, EnrichedJob[]> = {};
        const source = prev ?? jobsByStage;
        for (const key of Object.keys(source)) {
          current[Number(key)] = [...source[Number(key)]];
        }

        const sourceJobs = current[activeContainer] || [];
        const destJobs = current[overContainer] || [];

        const activeIndex = sourceJobs.findIndex((j) => j.id === Number(active.id));
        if (activeIndex === -1) return prev;

        const [movedItem] = sourceJobs.splice(activeIndex, 1);
        const overIndex = destJobs.findIndex((j) => j.id === Number(over.id));
        destJobs.splice(overIndex >= 0 ? overIndex : destJobs.length, 0, movedItem);

        current[activeContainer] = sourceJobs;
        current[overContainer] = destJobs;
        return current;
      });
    },
    [findContainer, jobsByStage]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const currentContainers = dragContainers ?? jobsByStage;

      setActiveJob(null);
      setDragContainers(null);

      if (!over) return;

      const activeId = Number(active.id);
      const overId = Number(over.id);

      let sourceStageId: number | null = null;
      let destStageId: number | null = null;

      const originalJob = jobs.find((j) => j.id === activeId);
      sourceStageId = originalJob?.kanban_stage_id ?? null;

      if (stages.some((s) => s.id === overId)) {
        destStageId = overId;
      } else {
        for (const [stageId, stageJobs] of Object.entries(currentContainers)) {
          if (stageJobs.some((j) => j.id === overId)) {
            destStageId = Number(stageId);
            break;
          }
        }
      }

      if (!destStageId) {
        for (const [stageId, stageJobs] of Object.entries(currentContainers)) {
          if (stageJobs.some((j) => j.id === activeId)) {
            destStageId = Number(stageId);
            break;
          }
        }
      }

      if (!sourceStageId || !destStageId) return;

      const destJobs = currentContainers[destStageId] || [];

      if (sourceStageId === destStageId) {
        const oldIndex = destJobs.findIndex((j) => j.id === activeId);
        const overJobIndex = destJobs.findIndex((j) => j.id === overId);

        if (oldIndex === -1) return;

        const newIndex =
          overId === destStageId
            ? destJobs.length - 1
            : overJobIndex !== -1
              ? overJobIndex
              : destJobs.length;

        if (oldIndex === newIndex) return;

        const reordered = arrayMove(destJobs, oldIndex, newIndex);
        const newOrder = reordered.findIndex((j) => j.id === activeId);

        onMoveJob(activeId, destStageId, Math.max(0, newOrder));
      } else {
        const newOrder = destJobs.findIndex((j) => j.id === activeId);
        onMoveJob(activeId, destStageId, newOrder >= 0 ? newOrder : destJobs.length);
      }
    },
    [dragContainers, jobsByStage, jobs, stages, onMoveJob]
  );

  const handleDragCancel = useCallback(() => {
    setActiveJob(null);
    setDragContainers(null);
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col bg-muted/20 rounded-xl p-2 min-w-[280px] w-[280px] min-h-[500px] shrink-0"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 - i % 2 }).map((_, j) => (
                <Skeleton key={j} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            jobs={activeJobsByStage[stage.id] || []}
            onDeleteJob={onDeleteJob}
            onClickJob={onClickJob}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeJob ? <JobCardOverlay job={activeJob} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
