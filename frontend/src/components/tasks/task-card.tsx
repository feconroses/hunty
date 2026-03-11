"use client";

import { useRef, useState } from "react";
import { ExternalLink, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/shared/status-chip";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ScanJobsForm,
  jobEntriesToResultData,
  type JobEntry,
} from "./scan-jobs-form";
import type { Task } from "@/types";
import { TASK_TYPE_CONFIG } from "@/lib/constants";

interface TaskCardProps {
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

const TASK_TYPE_STYLES: Record<string, string> = {
  find_careers_page: "bg-blue-500/20 text-blue-400 border-blue-500/25",
  scan_jobs: "bg-purple-500/20 text-purple-400 border-purple-500/25",
};

export function TaskCard({
  task,
  onComplete,
  onFail,
  onDelete,
  isLoading = false,
}: TaskCardProps) {
  const actionRef = useRef<HTMLSelectElement>(null);
  const [notes, setNotes] = useState(task.notes || "");
  const [careersUrl, setCareersUrl] = useState("");
  const [jobEntries, setJobEntries] = useState<JobEntry[]>([]);
  const [completing, setCompleting] = useState(false);
  const [failing, setFailing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const taskConfig = TASK_TYPE_CONFIG[task.task_type];
  const companyName = task.company_name || "Unknown";
  const companyUrl = task.company_url ?? undefined;
  const careersPageUrl = task.careers_page_url ?? undefined;

  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  const isDone = isCompleted || isFailed;
  const busy = completing || failing || isLoading;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      let resultData: Record<string, unknown> | undefined;
      if (task.task_type === "find_careers_page" && careersUrl.trim()) {
        resultData = { careers_url: careersUrl.trim() };
      } else if (task.task_type === "scan_jobs" && jobEntries.length > 0) {
        resultData = jobEntriesToResultData(jobEntries);
      }
      await onComplete(task.id, notes || undefined, resultData);
    } finally {
      setCompleting(false);
    }
  };

  const handleFail = async () => {
    setFailing(true);
    try {
      await onFail(task.id, notes || undefined);
    } finally {
      setFailing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4">
        {/* Header: type badge + company + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={TASK_TYPE_STYLES[task.task_type] || ""}
            >
              {taskConfig?.label || task.task_type}
            </Badge>
            <span className="text-sm font-medium text-foreground">
              {companyName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip status={task.status} />
            {!isDone && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setDeleteOpen(true)}
                className="text-muted-foreground hover:text-destructive"
                disabled={busy}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Task-type-specific content */}
        {!isDone && (
          <div className="mt-3 space-y-3">
            {task.task_type === "find_careers_page" && (
              <>
                {companyUrl && (
                  <a
                    href={companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    {companyUrl}
                  </a>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Careers Page URL
                  </label>
                  <Input
                    placeholder="https://company.com/careers"
                    value={careersUrl}
                    onChange={(e) => setCareersUrl(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </>
            )}

            {task.task_type === "scan_jobs" && (
              <>
                {careersPageUrl && (
                  <a
                    href={careersPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    {careersPageUrl}
                  </a>
                )}
                {task.filter_criteria && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Filter Criteria
                    </p>
                    <pre className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                      {task.filter_criteria}
                    </pre>
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Workflow:</strong> For each job found, add a job entry and fill in the URL first.
                    Check the URL status — if it says &quot;Duplicate&quot;, remove that entry and move on.
                    If it says &quot;New job&quot;, fill in the remaining fields.
                  </p>
                </div>
                <ScanJobsForm
                  companyId={task.company_id}
                  jobEntries={jobEntries}
                  onEntriesChange={setJobEntries}
                />
              </>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <Textarea
                placeholder="Add notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
                className="min-h-10"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={busy}
                className="bg-[#1db954] font-semibold text-black hover:bg-[#1ed760]"
              >
                {completing && <Loader2 className="size-3.5 animate-spin" />}
                Mark Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFail}
                disabled={busy}
                className="text-red-400 hover:text-red-300"
              >
                {failing && <Loader2 className="size-3.5 animate-spin" />}
                Mark Failed
              </Button>
            </div>

            {/* Hidden action trigger for Chrome extension compatibility (form_input works, left_click doesn't) */}
            <select
              ref={actionRef}
              aria-label="Task Action"
              className="sr-only"
              defaultValue=""
              onChange={(e) => {
                const action = e.target.value;
                if (action === "complete") handleComplete();
                else if (action === "fail") handleFail();
                if (actionRef.current) actionRef.current.value = "";
              }}
              disabled={busy}
            >
              <option value="">Select action</option>
              <option value="complete">Mark Complete</option>
              <option value="fail">Mark Failed</option>
            </select>
          </div>
        )}

        {/* Completed/failed: show notes if any */}
        {isDone && notes && (
          <p className="mt-2 text-xs text-muted-foreground">{notes}</p>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
