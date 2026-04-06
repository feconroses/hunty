"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ActivityList } from "@/components/activity/activity-list";
import { useActivity } from "@/hooks/use-activity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Activity" },
  { value: "task", label: "Tasks" },
  { value: "job", label: "Jobs" },
  { value: "company", label: "Companies" },
  { value: "linkedin_search", label: "LinkedIn Searches" },
  { value: "filter", label: "Filters" },
  { value: "kanban_stage", label: "Pipeline Stages" },
];

export default function ActivityPage() {
  const { activities, loading, hasMore, filters, loadMore, updateFilters } =
    useActivity();

  const currentFilter = filters.entity_type || "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        subtitle="View recent actions and system events"
        actions={
          <Select
            value={currentFilter}
            onValueChange={(value) =>
              updateFilters({
                entity_type: value === "all" || !value ? undefined : value,
              })
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Activity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <ActivityList
        activities={activities}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </div>
  );
}
