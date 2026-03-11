"use client";

import type { ActivityLogEntry } from "@/types";
import { ActivityItem } from "./activity-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity, Loader2 } from "lucide-react";

interface ActivityListProps {
  activities: ActivityLogEntry[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityList({
  activities,
  loading,
  hasMore,
  onLoadMore,
}: ActivityListProps) {
  if (loading && activities.length === 0) {
    return <ActivitySkeleton />;
  }

  if (!loading && activities.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Actions like completing tasks, discovering jobs, and adding companies will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
