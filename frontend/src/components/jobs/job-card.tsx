"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapPin, GripVertical } from "lucide-react";
import type { EnrichedJob, Job } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface JobCardProps {
  job: EnrichedJob;
  onDelete?: (id: number) => void;
  onClick?: (job: EnrichedJob) => void;
  isDragging?: boolean;
}

const WORK_TYPE_STYLES: Record<string, string> = {
  remote: "bg-green-500/20 text-green-400 border-green-500/30",
  hybrid: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  onsite: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  executive: "Executive",
};

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null
) {
  const cur = currency || "USD";
  const fmt = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toString();
  };

  if (min && max) return `${fmt(min)} - ${fmt(max)} ${cur}`;
  if (min) return `${fmt(min)}+ ${cur}`;
  if (max) return `Up to ${fmt(max)} ${cur}`;
  return null;
}

export function JobCard({ job, onClick, isDragging: isDraggingProp }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: job.id });

  const isDragging = isDraggingProp ?? isSortableDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all",
        isDragging && "opacity-50 scale-[1.02] shadow-lg z-50"
      )}
      onClick={(e) => {
        // Only trigger if not dragging and not clicking drag handle
        if (!isDragging && onClick) {
          onClick(job);
        }
      }}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle (visual only) */}
        <div className="mt-0.5 shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <GripVertical className="size-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title */}
          <p className="font-semibold text-sm text-foreground leading-tight truncate">
            {job.title}
          </p>

          {/* Company - we show company_id for now, the page passes enriched data */}
          {job.company_id && (
            <p className="text-xs text-muted-foreground truncate">
              {job.company_name || job.company_id}
            </p>
          )}

          {/* Location */}
          {job.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {job.work_type && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 h-4",
                  WORK_TYPE_STYLES[job.work_type]
                )}
              >
                {WORK_TYPE_LABELS[job.work_type]}
              </Badge>
            )}
            {job.seniority_level && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 h-4 bg-muted text-muted-foreground"
              >
                {SENIORITY_LABELS[job.seniority_level]}
              </Badge>
            )}
          </div>

          {/* Salary */}
          {salary && (
            <p className="text-xs text-muted-foreground">{salary}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Overlay version of JobCard (for DragOverlay, no sortable hooks) */
export function JobCardOverlay({ job }: { job: EnrichedJob }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);

  return (
    <div className="bg-card border border-primary/40 rounded-lg p-3 shadow-xl scale-[1.02] w-[300px] cursor-grabbing">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0 text-muted-foreground/50">
          <GripVertical className="size-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="font-semibold text-sm text-foreground leading-tight truncate">
            {job.title}
          </p>
          {job.company_id && (
            <p className="text-xs text-muted-foreground truncate">
              {job.company_name || job.company_id}
            </p>
          )}
          {job.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {job.work_type && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 h-4",
                  WORK_TYPE_STYLES[job.work_type]
                )}
              >
                {WORK_TYPE_LABELS[job.work_type]}
              </Badge>
            )}
            {job.seniority_level && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 h-4 bg-muted text-muted-foreground"
              >
                {SENIORITY_LABELS[job.seniority_level]}
              </Badge>
            )}
          </div>
          {salary && (
            <p className="text-xs text-muted-foreground">{salary}</p>
          )}
        </div>
      </div>
    </div>
  );
}
