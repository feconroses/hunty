"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { EnrichedJob, KanbanStage } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
        "flex flex-col bg-muted/30 border border-border/50 rounded-xl p-3 min-w-[300px] max-w-[350px] min-h-[500px] shrink-0 transition-colors",
        isOver && "border-primary/50 bg-muted/50"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold text-foreground truncate">
            {stage.name}
          </h3>
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 h-4 bg-muted text-muted-foreground tabular-nums"
        >
          {jobs.length}
        </Badge>
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
                "flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/40 min-h-[80px] transition-colors",
                isOver && "border-primary/40 bg-primary/5"
              )}
            >
              <p className="text-xs text-muted-foreground/60">
                Drop jobs here
              </p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
