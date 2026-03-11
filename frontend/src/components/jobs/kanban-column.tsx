"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { EnrichedJob, KanbanStage } from "@/types";
import { cn } from "@/lib/utils";
import { JobCard } from "./job-card";

interface KanbanColumnProps {
  stage: KanbanStage;
  jobs: EnrichedJob[];
  onDeleteJob?: (id: number) => void;
  onClickJob?: (job: EnrichedJob) => void;
}

export function KanbanColumn({
  stage,
  jobs,
  onDeleteJob,
  onClickJob,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
  });

  const sortedJobs = [...jobs].sort((a, b) => a.kanban_order - b.kanban_order);
  const jobIds = sortedJobs.map((j) => j.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/50 border border-border/40 rounded-xl p-2 min-w-[280px] w-[280px] min-h-[500px] shrink-0 transition-colors",
        isOver && "bg-primary/5"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1.5 py-1">
        <div className="flex items-center gap-2">
          <div
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-base font-medium uppercase tracking-wider text-muted-foreground truncate">
            {stage.name}
          </h3>
        </div>
        <span className="text-base tabular-nums text-muted-foreground">
          {jobs.length}
        </span>
      </div>

      {/* Sortable job list */}
      <SortableContext items={jobIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {sortedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={onDeleteJob}
              onClick={onClickJob}
            />
          ))}

          {/* Empty drop area */}
          {jobs.length === 0 && (
            <div
              className={cn(
                "flex-1 flex items-center justify-center rounded-lg min-h-[80px] transition-colors",
                isOver && "bg-primary/5"
              )}
            >
              <p className="text-sm text-muted-foreground/70">No jobs</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
