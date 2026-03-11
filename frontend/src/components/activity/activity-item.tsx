"use client";

import type { ActivityLogEntry } from "@/types";
import {
  CheckCircle,
  Briefcase,
  Building2,
  Filter,
  Columns3,
  ListTodo,
  Activity,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface ActivityItemProps {
  activity: ActivityLogEntry;
}

const ENTITY_ICONS: Record<string, typeof Activity> = {
  task: CheckCircle,
  job: Briefcase,
  company: Building2,
  filter: Filter,
  kanban_stage: Columns3,
};

const ENTITY_COLORS: Record<string, string> = {
  task: "text-green-500 bg-green-500/10",
  job: "text-blue-500 bg-blue-500/10",
  company: "text-purple-500 bg-purple-500/10",
  filter: "text-yellow-500 bg-yellow-500/10",
  kanban_stage: "text-indigo-500 bg-indigo-500/10",
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatAbsoluteTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDescription(activity: ActivityLogEntry): string {
  const { action, entity_type, details } = activity;
  const entityName = (details?.name as string) || (details?.title as string) || "";

  const actionVerb = action.replace(/_/g, " ");

  if (entityName) {
    const entityLabel = entity_type.replace(/_/g, " ");
    return `${actionVerb}: ${entityName} (${entityLabel})`;
  }

  return `${actionVerb} (${entity_type.replace(/_/g, " ")})`;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = ENTITY_ICONS[activity.entity_type] || ListTodo;
  const colorClass = ENTITY_COLORS[activity.entity_type] || "text-muted-foreground bg-muted";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30">
      <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          {buildDescription(activity)}
        </p>
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="mt-0.5 inline-block cursor-default text-xs text-muted-foreground">
                {formatRelativeTime(activity.created_at)}
              </span>
            }
          />
          <TooltipContent side="bottom">
            {formatAbsoluteTime(activity.created_at)}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
