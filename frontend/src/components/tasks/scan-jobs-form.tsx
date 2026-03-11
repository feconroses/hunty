"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkJobUrl } from "@/lib/api";

export interface JobEntry {
  title: string;
  location: string;
  work_type: string;
  salary_range: string;
  seniority_level: string;
  department: string;
  skills: string;
  description_summary: string;
  url: string;
}

const EMPTY_JOB: JobEntry = {
  title: "",
  location: "",
  work_type: "",
  salary_range: "",
  seniority_level: "",
  department: "",
  skills: "",
  description_summary: "",
  url: "",
};

const WORK_TYPE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const SENIORITY_OPTIONS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
];

type UrlStatus = "checking" | "exists" | "new" | null;

interface ScanJobsFormProps {
  companyId: number | null;
  jobEntries: JobEntry[];
  onEntriesChange: (entries: JobEntry[]) => void;
}

export function ScanJobsForm({ companyId, jobEntries, onEntriesChange }: ScanJobsFormProps) {
  const addJobRef = useRef<HTMLSelectElement>(null);
  const [urlStatuses, setUrlStatuses] = useState<Record<number, UrlStatus>>({});

  const addEntry = useCallback(() => {
    onEntriesChange([...jobEntries, { ...EMPTY_JOB }]);
  }, [jobEntries, onEntriesChange]);

  const removeEntry = useCallback(
    (index: number) => {
      onEntriesChange(jobEntries.filter((_, i) => i !== index));
      setUrlStatuses((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    },
    [jobEntries, onEntriesChange],
  );

  const updateEntry = useCallback(
    (index: number, field: keyof JobEntry, value: string) => {
      const updated = jobEntries.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      );
      onEntriesChange(updated);
    },
    [jobEntries, onEntriesChange],
  );

  const checkUrl = useCallback(
    async (index: number, url: string) => {
      if (!url.trim() || !companyId) {
        setUrlStatuses((prev) => ({ ...prev, [index]: null }));
        return;
      }
      setUrlStatuses((prev) => ({ ...prev, [index]: "checking" }));
      try {
        const { exists } = await checkJobUrl(companyId, url.trim());
        setUrlStatuses((prev) => ({ ...prev, [index]: exists ? "exists" : "new" }));
      } catch {
        setUrlStatuses((prev) => ({ ...prev, [index]: null }));
      }
    },
    [companyId],
  );

  // Debounced URL check: trigger when a URL value changes
  useEffect(() => {
    const timers: Record<number, ReturnType<typeof setTimeout>> = {};
    jobEntries.forEach((entry, index) => {
      if (entry.url.trim()) {
        timers[index] = setTimeout(() => checkUrl(index, entry.url), 500);
      }
    });
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
    // Only re-run when URLs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobEntries.map((e) => e.url).join("|"), checkUrl]);

  return (
    <div className="space-y-3">
      {jobEntries.map((entry, index) => (
        <Card key={index} size="sm" className="bg-muted/30">
          <CardHeader className="flex-row items-center justify-between border-b pb-2">
            <CardTitle className="text-sm font-medium">
              Job {index + 1}
            </CardTitle>
            <button
              type="button"
              onClick={() => removeEntry(index)}
              className="inline-flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {/* Row 1: Title + URL */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Title
                </label>
                <Input
                  placeholder="Job title"
                  value={entry.title}
                  onChange={(e) => updateEntry(index, "title", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Job URL
                </label>
                <Input
                  placeholder="https://..."
                  value={entry.url}
                  onChange={(e) => updateEntry(index, "url", e.target.value)}
                />
                {urlStatuses[index] === "checking" && (
                  <p className="text-xs text-muted-foreground mt-1">Checking URL...</p>
                )}
                {urlStatuses[index] === "exists" && (
                  <p className="text-xs text-red-400 mt-1" aria-label="URL status">
                    Duplicate — this job already exists in the database
                  </p>
                )}
                {urlStatuses[index] === "new" && (
                  <p className="text-xs text-green-400 mt-1" aria-label="URL status">
                    New job — not in database yet
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Location + Department */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Location
                </label>
                <Input
                  placeholder="City, Country"
                  value={entry.location}
                  onChange={(e) =>
                    updateEntry(index, "location", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Department
                </label>
                <Input
                  placeholder="Engineering, Marketing..."
                  value={entry.department}
                  onChange={(e) =>
                    updateEntry(index, "department", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Row 3: Work Type + Seniority */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Work Type
                </label>
                <select
                  value={entry.work_type}
                  onChange={(e) => updateEntry(index, "work_type", e.target.value)}
                  className="h-8 w-full rounded-lg border border-border bg-transparent px-2 text-sm text-foreground"
                >
                  <option value="">Select type</option>
                  {WORK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Seniority
                </label>
                <select
                  value={entry.seniority_level}
                  onChange={(e) => updateEntry(index, "seniority_level", e.target.value)}
                  className="h-8 w-full rounded-lg border border-border bg-transparent px-2 text-sm text-foreground"
                >
                  <option value="">Select level</option>
                  {SENIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Salary + Skills */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Salary Range
                </label>
                <Input
                  placeholder="$80k-$120k"
                  value={entry.salary_range}
                  onChange={(e) =>
                    updateEntry(index, "salary_range", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Skills
                </label>
                <Input
                  placeholder="React, TypeScript, Node.js..."
                  value={entry.skills}
                  onChange={(e) =>
                    updateEntry(index, "skills", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Row 5: Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Description Summary
              </label>
              <Textarea
                placeholder="Brief summary of the role..."
                value={entry.description_summary}
                onChange={(e) =>
                  updateEntry(index, "description_summary", e.target.value)
                }
                className="min-h-12"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <button type="button" onClick={addEntry} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted transition-colors">
        <Plus className="size-3.5" />
        Add Job
      </button>

      {/* Hidden action trigger for Chrome extension compatibility */}
      <select
        ref={addJobRef}
        aria-label="Add Job"
        className="sr-only"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value === "add") addEntry();
          if (addJobRef.current) addJobRef.current.value = "";
        }}
      >
        <option value="">Select</option>
        <option value="add">Add Job</option>
      </select>
    </div>
  );
}

/** Convert job entries to the result_data format for task completion */
export function jobEntriesToResultData(entries: JobEntry[]): Record<string, unknown> {
  return {
    jobs: entries
      .filter((e) => e.title.trim() !== "")
      .map((e) => ({
        title: e.title,
        location: e.location || null,
        work_type: e.work_type || null,
        salary_range: e.salary_range || null,
        seniority_level: e.seniority_level || null,
        department: e.department || null,
        skills: e.skills
          ? e.skills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        description_summary: e.description_summary || null,
        url: e.url || null,
      })),
  };
}
