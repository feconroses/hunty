"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ExternalLink,
  MapPin,
  Briefcase,
  DollarSign,
  Tag,
  Building2,
  Calendar,
  ChevronDown,
  Trash2,
} from "lucide-react";
import type { EnrichedJob, Job, KanbanStage } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

function formatSalaryFull(
  min: number | null,
  max: number | null,
  currency: string | null
) {
  const cur = currency || "USD";
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 0,
  });

  if (min && max) return `${fmt.format(min)} - ${fmt.format(max)}`;
  if (min) return `${fmt.format(min)}+`;
  if (max) return `Up to ${fmt.format(max)}`;
  return null;
}

interface JobDetailPanelProps {
  job: EnrichedJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: KanbanStage[];
  onUpdate: (id: number, data: Partial<Job>) => Promise<Job>;
  onDelete: (id: number) => Promise<void>;
}

export function JobDetailPanel({
  job,
  open,
  onOpenChange,
  stages,
  onUpdate,
  onDelete,
}: JobDetailPanelProps) {
  const [notes, setNotes] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync notes when job changes
  useEffect(() => {
    setNotes(job?.notes ?? "");
  }, [job]);

  const handleStageChange = useCallback(
    async (newStageId: string | null) => {
      if (!job || !newStageId) return;
      const numericStageId = Number(newStageId);
      if (numericStageId === job.kanban_stage_id) return;
      await onUpdate(job.id, { kanban_stage_id: numericStageId });
    },
    [job, onUpdate]
  );

  const handleNotesBlur = useCallback(async () => {
    if (!job) return;
    const currentNotes = job?.notes ?? "";
    if (notes !== currentNotes) {
      await onUpdate(job.id, { notes } as Partial<Job>);
    }
  }, [job, notes, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!job) return;
    setIsDeleting(true);
    try {
      await onDelete(job.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  }, [job, onDelete, onOpenChange]);

  if (!job) return null;

  const salary = formatSalaryFull(
    job.salary_min,
    job.salary_max,
    job.salary_currency
  );
  const currentStage = stages.find((s) => s.id === job.kanban_stage_id);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[450px] overflow-y-auto"
        >
          <SheetHeader className="pr-8">
            <SheetTitle className="text-lg leading-tight">
              {job.title}
            </SheetTitle>
            <SheetDescription>
              {job.company_name || "Company"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-6">
            {/* Actions row */}
            <div className="flex items-center gap-2">
              {job.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(job.url!, "_blank")}
                >
                  <ExternalLink className="size-3.5" />
                  Open Job URL
                </Button>
              )}
            </div>

            {/* Stage selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Stage
              </label>
              <Select
                value={job.kanban_stage_id != null ? String(job.kanban_stage_id) : undefined}
                onValueChange={handleStageChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {currentStage && (
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: currentStage.color }}
                        />
                        {currentStage.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={String(stage.id)}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Details grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Details
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {job.location && (
                  <DetailItem
                    icon={MapPin}
                    label="Location"
                    value={job.location}
                  />
                )}
                {job.work_type && (
                  <DetailItem
                    icon={Briefcase}
                    label="Work Type"
                    value={
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 h-4",
                          WORK_TYPE_STYLES[job.work_type]
                        )}
                      >
                        {WORK_TYPE_LABELS[job.work_type]}
                      </Badge>
                    }
                  />
                )}
                {salary && (
                  <DetailItem
                    icon={DollarSign}
                    label="Salary Range"
                    value={salary}
                  />
                )}
                {job.seniority_level && (
                  <DetailItem
                    icon={Tag}
                    label="Seniority"
                    value={SENIORITY_LABELS[job.seniority_level]}
                  />
                )}
                {job.department && (
                  <DetailItem
                    icon={Building2}
                    label="Department"
                    value={job.department}
                  />
                )}
                <DetailItem
                  icon={Calendar}
                  label="Discovered"
                  value={new Date(job.discovered_at).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  )}
                />
              </div>
            </div>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Description summary */}
            {job.description_summary && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Summary
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {job.description_summary}
                  </p>
                </div>
              </>
            )}

            {/* Full description (collapsible) */}
            {job.full_description && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ChevronDown className="size-3.5 transition-transform [[data-panel-open]_&]:rotate-180" />
                  Full Description
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/30 p-3 border border-border/50 max-h-[300px] overflow-y-auto">
                    {job.full_description}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Notes */}
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Notes
              </h4>
              <Textarea
                placeholder="Add your notes about this job..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                className="min-h-[80px] text-sm"
              />
            </div>

            {/* Delete */}
            <Separator />
            <div className="pt-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="w-full"
              >
                <Trash2 className="size-3.5" />
                Delete Job
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{job.title}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}
