"use client";

import { useState, useEffect, useCallback } from "react";
import { Kanban, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KanbanBoard } from "@/components/jobs/kanban-board";
import { KanbanFilters } from "@/components/jobs/kanban-filters";
import { JobDetailPanel } from "@/components/jobs/job-detail-panel";
import { useJobs } from "@/hooks/use-jobs";
import { useKanbanStages } from "@/hooks/use-kanban-stages";
import { getCompanies } from "@/lib/api";
import type { Company, EnrichedJob, Job } from "@/types";

export default function JobsPage() {
  const {
    jobs,
    loading: jobsLoading,
    error: jobsError,
    filters,
    setFilters,
    updateJob,
    deleteJob,
    moveJob,
  } = useJobs();

  const {
    stages,
    loading: stagesLoading,
  } = useKanbanStages();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedJob, setSelectedJob] = useState<EnrichedJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch companies for filter dropdown
  useEffect(() => {
    let cancelled = false;
    getCompanies()
      .then((data) => {
        if (!cancelled) setCompanies(data);
      })
      .catch(() => {
        // Silent fail for company list
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Enrich jobs with company names
  const enrichedJobs: EnrichedJob[] = jobs.map((job) => {
    const company = companies.find((c) => c.id === job.company_id);
    return {
      ...job,
      company_name: company?.name ?? "",
    };
  });

  const handleMoveJob = useCallback(
    async (jobId: number, newStageId: number, newOrder: number) => {
      try {
        await moveJob(jobId, newStageId, newOrder);
      } catch {
        toast.error("Failed to move job. Please try again.");
      }
    },
    [moveJob]
  );

  const handleDeleteJob = useCallback(
    async (id: number) => {
      try {
        await deleteJob(id);
        toast.success("Job deleted successfully.");
      } catch {
        toast.error("Failed to delete job. Please try again.");
      }
    },
    [deleteJob]
  );

  const handleUpdateJob = useCallback(
    async (id: number, data: Partial<Job>) => {
      try {
        const updated = await updateJob(id, data);
        toast.success("Job updated successfully.");
        // Update selectedJob if it's the same
        setSelectedJob((prev) => (prev?.id === id ? { ...prev, ...updated } : prev));
        return updated;
      } catch {
        toast.error("Failed to update job. Please try again.");
        throw new Error("Update failed");
      }
    },
    [updateJob]
  );

  const handleClickJob = useCallback((job: EnrichedJob) => {
    setSelectedJob(job);
    setDetailOpen(true);
  }, []);

  const handleDetailOpenChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      // Small delay to allow sheet animation to complete
      setTimeout(() => setSelectedJob(null), 200);
    }
  }, []);

  const isLoading = jobsLoading || stagesLoading;
  const isEmpty = !isLoading && jobs.length === 0 && stages.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jobs Pipeline"
        subtitle="Drag and drop jobs between stages to track your progress"
      />

      {/* Error state */}
      {jobsError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {jobsError}
        </div>
      )}

      {/* Filters */}
      {!isLoading && stages.length > 0 && (
        <KanbanFilters
          filters={filters}
          onFiltersChange={setFilters}
          companies={companies}
        />
      )}

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Jobs will appear here once they are discovered by scanning your tracked companies."
        />
      )}

      {/* Empty stages state */}
      {!isLoading && stages.length === 0 && (
        <EmptyState
          icon={Kanban}
          title="No pipeline stages"
          description="Kanban stages will be created automatically. Please check your configuration."
        />
      )}

      {/* Kanban board */}
      {(isLoading || stages.length > 0) && (
        <KanbanBoard
          jobs={enrichedJobs}
          stages={stages}
          onMoveJob={handleMoveJob}
          onDeleteJob={handleDeleteJob}
          onClickJob={handleClickJob}
          loading={isLoading}
        />
      )}

      {/* Job detail panel */}
      <JobDetailPanel
        job={selectedJob}
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
        stages={stages}
        onUpdate={handleUpdateJob}
        onDelete={handleDeleteJob}
      />
    </div>
  );
}
