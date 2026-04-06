"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ExternalLink,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IC_SENIORITY_LEVELS,
  MANAGEMENT_SENIORITY_LEVELS,
  SENIORITY_LABELS,
} from "@/lib/constants";
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

const WORK_TYPE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];


interface FormData {
  title: string;
  url: string;
  location: string;
  work_type: string;
  seniority_level: string;
  department: string;
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  skills: string;
  language_requirements: string;
  description_summary: string;
  full_description: string;
  notes: string;
}

function jobToFormData(job: EnrichedJob): FormData {
  return {
    title: job.title || "",
    url: job.url || "",
    location: job.location || "",
    work_type: job.work_type || "",
    seniority_level: job.seniority_level || "",
    department: job.department || "",
    salary_min: job.salary_min != null ? String(job.salary_min) : "",
    salary_max: job.salary_max != null ? String(job.salary_max) : "",
    salary_currency: job.salary_currency || "USD",
    skills: (job.skills || []).join(", "),
    language_requirements: job.language_requirements || "",
    description_summary: job.description_summary || "",
    full_description: job.full_description || "",
    notes: job.notes || "",
  };
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
  const [form, setForm] = useState<FormData>({
    title: "", url: "", location: "", work_type: "", seniority_level: "",
    department: "", salary_min: "", salary_max: "", salary_currency: "USD",
    skills: "", language_requirements: "", description_summary: "",
    full_description: "", notes: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync form when job changes
  useEffect(() => {
    if (job) {
      setForm(jobToFormData(job));
    }
  }, [job]);

  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleBlur = useCallback(
    async (field: keyof FormData) => {
      if (!job) return;
      const value = form[field];

      // Build the update payload based on field type
      let update: Partial<Job> = {};

      switch (field) {
        case "title":
          if (value === (job.title || "")) return;
          update = { title: value || "Untitled" };
          break;
        case "url":
          if (value === (job.url || "")) return;
          update = { url: value || null } as Partial<Job>;
          break;
        case "location":
          if (value === (job.location || "")) return;
          update = { location: value || null } as Partial<Job>;
          break;
        case "department":
          if (value === (job.department || "")) return;
          update = { department: value || null } as Partial<Job>;
          break;
        case "language_requirements":
          if (value === (job.language_requirements || "")) return;
          update = { language_requirements: value || null } as Partial<Job>;
          break;
        case "salary_min": {
          const num = value ? Number(value) : null;
          if (num === job.salary_min) return;
          update = { salary_min: num } as Partial<Job>;
          break;
        }
        case "salary_max": {
          const num = value ? Number(value) : null;
          if (num === job.salary_max) return;
          update = { salary_max: num } as Partial<Job>;
          break;
        }
        case "salary_currency":
          if (value === (job.salary_currency || "USD")) return;
          update = { salary_currency: value || "USD" } as Partial<Job>;
          break;
        case "skills": {
          const newSkills = value
            ? value.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          const oldSkills = (job.skills || []).join(", ");
          if (value === oldSkills) return;
          update = { skills: newSkills } as Partial<Job>;
          break;
        }
        case "description_summary":
          if (value === (job.description_summary || "")) return;
          update = { description_summary: value || null } as Partial<Job>;
          break;
        case "full_description":
          if (value === (job.full_description || "")) return;
          update = { full_description: value || null } as Partial<Job>;
          break;
        case "notes":
          if (value === (job.notes || "")) return;
          update = { notes: value || null } as Partial<Job>;
          break;
        default:
          return;
      }

      await onUpdate(job.id, update);
    },
    [job, form, onUpdate],
  );

  const handleSelectChange = useCallback(
    async (field: "work_type" | "seniority_level", value: string | null) => {
      if (!job) return;
      const cleanValue = value === "_none" ? null : value;
      const currentValue = job[field] || null;
      if (cleanValue === currentValue) return;

      setForm((prev) => ({ ...prev, [field]: cleanValue || "" }));
      await onUpdate(job.id, { [field]: cleanValue } as Partial<Job>);
    },
    [job, onUpdate],
  );

  const handleStageChange = useCallback(
    async (newStageId: string | null) => {
      if (!job || !newStageId) return;
      const numericStageId = Number(newStageId);
      if (numericStageId === job.kanban_stage_id) return;
      await onUpdate(job.id, { kanban_stage_id: numericStageId });
    },
    [job, onUpdate],
  );

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

  const currentStage = stages.find((s) => s.id === job.kanban_stage_id);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[450px] overflow-y-auto"
        >
          <SheetHeader className="pr-8">
            <SheetTitle className="sr-only">Edit Job</SheetTitle>
            <SheetDescription className="sr-only">
              Edit job details
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-6">
            {/* Title */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                onBlur={() => handleBlur("title")}
                className="text-lg font-semibold h-auto py-1.5"
              />
            </div>

            {/* Company (read-only) */}
            <p className="text-base text-muted-foreground -mt-3">
              {job.company_name || "Company"}
            </p>

            {/* URL */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Job URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.url}
                  onChange={(e) => updateField("url", e.target.value)}
                  onBlur={() => handleBlur("url")}
                  placeholder="https://..."
                  className="flex-1"
                />
                {form.url && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => window.open(form.url, "_blank")}
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Stage selector */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stage</Label>
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

            {/* Location + Department */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  onBlur={() => handleBlur("location")}
                  placeholder="City, Country"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Department</Label>
                <Input
                  value={form.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  onBlur={() => handleBlur("department")}
                  placeholder="Engineering..."
                />
              </div>
            </div>

            {/* Work Type + Seniority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Work Type</Label>
                <Select
                  value={form.work_type || "_none"}
                  onValueChange={(v) => handleSelectChange("work_type", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {WORK_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Seniority</Label>
                <Select
                  value={form.seniority_level || "_none"}
                  onValueChange={(v) => handleSelectChange("seniority_level", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    <SelectGroup>
                      <SelectLabel>IC</SelectLabel>
                      {IC_SENIORITY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {SENIORITY_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Management</SelectLabel>
                      {MANAGEMENT_SENIORITY_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {SENIORITY_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Salary */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Salary Range</Label>
              <div className="grid grid-cols-[1fr_1fr_80px] gap-2">
                <Input
                  type="number"
                  value={form.salary_min}
                  onChange={(e) => updateField("salary_min", e.target.value)}
                  onBlur={() => handleBlur("salary_min")}
                  placeholder="Min"
                />
                <Input
                  type="number"
                  value={form.salary_max}
                  onChange={(e) => updateField("salary_max", e.target.value)}
                  onBlur={() => handleBlur("salary_max")}
                  placeholder="Max"
                />
                <Input
                  value={form.salary_currency}
                  onChange={(e) => updateField("salary_currency", e.target.value)}
                  onBlur={() => handleBlur("salary_currency")}
                  placeholder="USD"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Skills</Label>
              <Input
                value={form.skills}
                onChange={(e) => updateField("skills", e.target.value)}
                onBlur={() => handleBlur("skills")}
                placeholder="React, TypeScript, Node.js..."
              />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
            </div>

            {/* Language Requirements */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Language Requirements</Label>
              <Input
                value={form.language_requirements}
                onChange={(e) => updateField("language_requirements", e.target.value)}
                onBlur={() => handleBlur("language_requirements")}
                placeholder="e.g., English required, no German needed"
              />
            </div>

            <Separator />

            {/* Description Summary */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Summary</Label>
              <Textarea
                value={form.description_summary}
                onChange={(e) => updateField("description_summary", e.target.value)}
                onBlur={() => handleBlur("description_summary")}
                placeholder="Brief summary of the role..."
                className="min-h-[60px] text-base"
              />
            </div>

            {/* Full Description (collapsible) */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ChevronDown className="size-3.5 transition-transform [[data-panel-open]_&]:rotate-180" />
                Full Description
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  value={form.full_description}
                  onChange={(e) => updateField("full_description", e.target.value)}
                  onBlur={() => handleBlur("full_description")}
                  placeholder="Full job description..."
                  className="mt-2 min-h-[200px] text-base"
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Notes */}
            <Separator />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
              <Textarea
                placeholder="Add your notes about this job..."
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                onBlur={() => handleBlur("notes")}
                className="min-h-[80px] text-base"
              />
            </div>

            {/* Discovered date (read-only) */}
            <p className="text-xs text-muted-foreground">
              Discovered {new Date(job.discovered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>

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
