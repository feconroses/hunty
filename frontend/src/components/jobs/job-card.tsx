"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapPin } from "lucide-react";
import type { EnrichedJob } from "@/types";
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
        "group bg-card border border-border/40 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all duration-150 ease-out hover:border-border hover:bg-muted/30",
        isDragging && "opacity-40 ring-1 ring-primary/30 shadow-lg shadow-primary/5 z-50"
      )}
      onClick={(e) => {
        if (!isDragging && onClick) {
          onClick(job);
        }
      }}
    >
      <div className="space-y-1.5">
        {/* Title */}
        <p className="font-semibold text-base text-foreground/90 leading-tight truncate">
          {job.title}
        </p>

        {/* Company */}
        {job.company_id && (
          <p className="text-base font-medium text-muted-foreground truncate">
            {job.company_name || job.company_id}
          </p>
        )}

        {/* Location */}
        {job.location && (
          <div className="flex items-center gap-1 text-base text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {job.work_type && (
            <Badge
              variant="outline"
              className={cn(
                "text-sm px-2 h-5",
                WORK_TYPE_STYLES[job.work_type]
              )}
            >
              {WORK_TYPE_LABELS[job.work_type]}
            </Badge>
          )}
          {job.seniority_level && (
            <Badge
              variant="secondary"
              className="text-sm px-2 h-5 bg-muted text-muted-foreground"
            >
              {SENIORITY_LABELS[job.seniority_level]}
            </Badge>
          )}
        </div>

        {/* Salary */}
        {salary && (
          <p className="text-base text-muted-foreground">{salary}</p>
        )}
      </div>
    </div>
  );
}

/** Overlay version of JobCard (for DragOverlay, no sortable hooks) */
export function JobCardOverlay({ job }: { job: EnrichedJob }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);

  return (
    <div className="bg-card border border-primary/30 ring-1 ring-primary/20 rounded-lg p-3 shadow-xl shadow-primary/10 w-[280px] cursor-grabbing">
      <div className="space-y-1.5">
        <p className="font-semibold text-base text-foreground/90 leading-tight truncate">
          {job.title}
        </p>
        {job.company_id && (
          <p className="text-base font-medium text-muted-foreground truncate">
            {job.company_name || job.company_id}
          </p>
        )}
        {job.location && (
          <div className="flex items-center gap-1 text-base text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {job.work_type && (
            <Badge
              variant="outline"
              className={cn(
                "text-sm px-2 h-5",
                WORK_TYPE_STYLES[job.work_type]
              )}
            >
              {WORK_TYPE_LABELS[job.work_type]}
            </Badge>
          )}
          {job.seniority_level && (
            <Badge
              variant="secondary"
              className="text-sm px-2 h-5 bg-muted text-muted-foreground"
            >
              {SENIORITY_LABELS[job.seniority_level]}
            </Badge>
          )}
        </div>
        {salary && (
          <p className="text-base text-muted-foreground">{salary}</p>
        )}
      </div>
    </div>
  );
}
