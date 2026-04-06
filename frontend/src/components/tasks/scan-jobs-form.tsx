"use client";

import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Plus, X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkJobUrl, addJobToTask } from "@/lib/api";
import type { Task, SavedJobSummary } from "@/types";

export interface JobEntry {
  title: string;
  company_name: string;
  location: string;
  work_type: string;
  salary_range: string;
  seniority_level: string;
  department: string;
  skills: string;
  language_requirements: string;
  description_summary: string;
  url: string;
}

const EMPTY_JOB: JobEntry = {
  title: "",
  company_name: "",
  location: "",
  work_type: "",
  salary_range: "",
  seniority_level: "",
  department: "",
  skills: "",
  language_requirements: "",
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

export interface ScanJobsFormHandle {
  saveActiveEntry: () => Promise<boolean>;
}

interface ScanJobsFormProps {
  taskId: number;
  companyId: number | null;
  savedJobs: SavedJobSummary[];
  onJobSaved: (updatedTask: Task) => void;
  showCompanyName?: boolean;
}

export const ScanJobsForm = forwardRef<ScanJobsFormHandle, ScanJobsFormProps>(
  function ScanJobsForm(
    { taskId, companyId, savedJobs, onJobSaved, showCompanyName = false },
    ref,
  ) {
    const addJobRef = useRef<HTMLSelectElement>(null);
    const removeJobRef = useRef<HTMLSelectElement>(null);
    const checkUrlRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const [activeEntry, setActiveEntry] = useState<JobEntry | null>({ ...EMPTY_JOB });
    const [urlStatus, setUrlStatus] = useState<UrlStatus>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [checkUrl, setCheckUrl] = useState("");
    const [checkUrlStatus, setCheckUrlStatus] = useState<UrlStatus>(null);

    // Quick URL checker: debounce + auto-clear after result
    useEffect(() => {
      if (!checkUrl.trim()) {
        setCheckUrlStatus(null);
        return;
      }
      const timer = setTimeout(async () => {
        setCheckUrlStatus("checking");
        try {
          const { exists } = await checkJobUrl(companyId, checkUrl.trim());
          setCheckUrlStatus(exists ? "exists" : "new");
          // Auto-clear after 30 seconds
          setTimeout(() => {
            setCheckUrl("");
            setCheckUrlStatus(null);
          }, 30000);
        } catch {
          setCheckUrlStatus(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [checkUrl, companyId]);

    // Poll DOM for URL checker input changes (Chrome extension compatibility)
    useEffect(() => {
      if (!checkUrlRef.current) return;
      const interval = setInterval(() => {
        const input = checkUrlRef.current?.querySelector(
          'input[placeholder="Paste job URL to check..."]',
        ) as HTMLInputElement;
        if (input && input.value !== checkUrl) {
          setCheckUrl(input.value);
        }
      }, 500);
      return () => clearInterval(interval);
    }, [checkUrl]);

    // Poll DOM for form_input changes that React's onChange misses
    // (Chrome extension sets DOM values directly without triggering React events)
    useEffect(() => {
      if (!activeEntry || !formRef.current) return;
      const interval = setInterval(() => {
        const el = formRef.current;
        if (!el) return;
        const q = (placeholder: string) =>
          (el.querySelector(`input[placeholder="${placeholder}"]`) as HTMLInputElement)?.value ?? "";
        const qTextarea = (placeholder: string) =>
          (el.querySelector(`textarea[placeholder="${placeholder}"]`) as HTMLTextAreaElement)?.value ?? "";
        const selects = el.querySelectorAll("select:not(.sr-only)");

        const domValues: Partial<JobEntry> = {
          title: q("Job title"),
          url: q("https://..."),
          company_name: q("Company that posted this job"),
          location: q("City, Country"),
          department: q("Engineering, Marketing..."),
          work_type: (selects[0] as HTMLSelectElement)?.value ?? "",
          seniority_level: (selects[1] as HTMLSelectElement)?.value ?? "",
          salary_range: q("$80k-$120k"),
          skills: q("React, TypeScript, Node.js..."),
          language_requirements: q("e.g., English required, no German needed"),
          description_summary: qTextarea("Brief summary of the role..."),
        };

        // Check if any DOM value differs from React state
        let changed = false;
        const updates: Partial<JobEntry> = {};
        for (const [key, domVal] of Object.entries(domValues)) {
          const k = key as keyof JobEntry;
          if (domVal !== activeEntry[k]) {
            updates[k] = domVal as string;
            changed = true;
          }
        }
        if (changed) {
          setActiveEntry((prev) => (prev ? { ...prev, ...updates } : prev));
        }
      }, 500);
      return () => clearInterval(interval);
    }, [activeEntry]);

    // URL check debounce
    useEffect(() => {
      if (!activeEntry?.url.trim()) {
        setUrlStatus(null);
        return;
      }
      const timer = setTimeout(async () => {
        setUrlStatus("checking");
        try {
          const { exists } = await checkJobUrl(
            companyId,
            activeEntry.url.trim(),
          );
          setUrlStatus(exists ? "exists" : "new");
        } catch {
          setUrlStatus(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [activeEntry?.url, companyId]);

    const updateEntry = useCallback(
      (field: keyof JobEntry, value: string) => {
        setActiveEntry((prev) => (prev ? { ...prev, [field]: value } : prev));
        if (saveError) setSaveError(null);
      },
      [saveError],
    );

    const saveEntry = useCallback(
      async (entry: JobEntry): Promise<boolean> => {
        if (!entry.title.trim()) return true; // nothing to save
        setSaving(true);
        setSaveError(null);
        try {
          const updatedTask = await addJobToTask(taskId, {
            title: entry.title,
            company_name: entry.company_name || null,
            url: entry.url || null,
            location: entry.location || null,
            work_type: entry.work_type || null,
            salary_range: entry.salary_range || null,
            seniority_level: entry.seniority_level || null,
            department: entry.department || null,
            skills: entry.skills
              ? entry.skills
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [],
            language_requirements: entry.language_requirements || null,
            description_summary: entry.description_summary || null,
          });
          onJobSaved(updatedTask);
          return true;
        } catch (err: unknown) {
          const error = err as { response?: { data?: { detail?: string } } };
          if (error?.response?.data?.detail === "duplicate_url") {
            setSaveError("This job URL already exists in the database.");
          } else {
            setSaveError("Failed to save job. Please try again.");
          }
          return false;
        } finally {
          setSaving(false);
        }
      },
      [taskId, onJobSaved],
    );

    // Read entry from DOM as fallback when form_input sets values
    // but React's onChange doesn't fire (Chrome extension compatibility)
    const readEntryFromDOM = useCallback((): JobEntry | null => {
      const el = formRef.current;
      if (!el) return null;
      const q = (placeholder: string) =>
        (el.querySelector(`input[placeholder="${placeholder}"]`) as HTMLInputElement)?.value || "";
      const qSelect = (label: string) =>
        (el.querySelector(`select[aria-label="${label}"], label:has(+ select)`) as HTMLSelectElement)?.value || "";
      const qTextarea = (placeholder: string) =>
        (el.querySelector(`textarea[placeholder="${placeholder}"]`) as HTMLTextAreaElement)?.value || "";

      const title = q("Job title");
      if (!title.trim()) return null;

      // Read select values by finding selects within the form
      const selects = el.querySelectorAll("select:not(.sr-only)");
      const workType = (selects[0] as HTMLSelectElement)?.value || "";
      const seniority = (selects[1] as HTMLSelectElement)?.value || "";

      return {
        title,
        url: q("https://..."),
        company_name: q("Company that posted this job"),
        location: q("City, Country"),
        department: q("Engineering, Marketing..."),
        work_type: workType,
        seniority_level: seniority,
        salary_range: q("$80k-$120k"),
        skills: q("React, TypeScript, Node.js..."),
        language_requirements: q("e.g., English required, no German needed"),
        description_summary: qTextarea("Brief summary of the role..."),
      };
    }, []);

    const getEntryToSave = useCallback((): JobEntry | null => {
      // Use React state if it has data
      if (activeEntry && activeEntry.title.trim()) return activeEntry;
      // Fallback: read from DOM (for Chrome extension form_input compatibility)
      return readEntryFromDOM();
    }, [activeEntry, readEntryFromDOM]);

    const handleAddJob = useCallback(async () => {
      const entry = getEntryToSave();
      if (entry) {
        const saved = await saveEntry(entry);
        if (!saved) return;
      }
      setActiveEntry({ ...EMPTY_JOB });
      setUrlStatus(null);
    }, [getEntryToSave, saveEntry]);

    const handleRemoveJob = useCallback(() => {
      setActiveEntry(null);
      setUrlStatus(null);
      setSaveError(null);
    }, []);

    // Expose saveActiveEntry for TaskCard to call before completing
    useImperativeHandle(
      ref,
      () => ({
        saveActiveEntry: async () => {
          const entry = getEntryToSave();
          if (!entry) return true;
          const saved = await saveEntry(entry);
          if (saved) setActiveEntry(null);
          return saved;
        },
      }),
      [activeEntry, saveEntry],
    );

    return (
      <div className="space-y-3">
        {/* Saved jobs (collapsed, read-only) */}
        {savedJobs.map((job, index) => (
          <Card key={job.job_id} size="sm" className="bg-muted/30">
            <CardHeader className="flex-row items-center justify-between pb-0 pt-2.5 px-3">
              <div className="flex items-center gap-2 min-w-0">
                <CardTitle className="text-base font-medium shrink-0">
                  Job {index + 1}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="bg-green-500/15 text-green-400 border-green-500/25 text-xs shrink-0"
                >
                  <Check className="size-3 mr-0.5" />
                  Saved
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-2.5 pt-1.5">
              <p className="text-sm text-muted-foreground truncate">
                <span className="text-foreground font-medium">
                  {job.title}
                </span>
                {job.company_name && (
                  <span className="text-muted-foreground">
                    {" "}
                    at {job.company_name}
                  </span>
                )}
              </p>
              {job.url && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {job.url}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Quick URL checker — check duplicates without creating an entry */}
        <div ref={checkUrlRef} className="flex items-start gap-2">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Paste job URL to check..."
              value={checkUrl}
              onChange={(e) => setCheckUrl(e.target.value)}
              className="h-7 text-xs"
              aria-label="Check URL"
            />
            {checkUrlStatus === "checking" && (
              <p className="text-xs text-muted-foreground">Checking URL...</p>
            )}
            {checkUrlStatus === "exists" && (
              <p className="text-xs text-red-400" aria-label="Check URL status">
                Duplicate — already in database. Clearing in 30s...
              </p>
            )}
            {checkUrlStatus === "new" && (
              <p className="text-xs text-green-400" aria-label="Check URL status">
                New job — not in database. Use Add Job to create an entry.
              </p>
            )}
          </div>
        </div>

        {/* Active entry (editable) */}
        {activeEntry && (
          <Card ref={formRef} size="sm" className="bg-muted/30 border-primary/20">
            <CardHeader className="flex-row items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">
                  Job {savedJobs.length + 1}
                </CardTitle>
                {saving && (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveEntry(null);
                  setUrlStatus(null);
                  setSaveError(null);
                }}
                className="inline-flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                disabled={saving}
              >
                <X className="size-3.5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              {saveError && (
                <p className="text-sm text-red-400">{saveError}</p>
              )}

              {/* Row 1: Title + URL */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Title
                  </label>
                  <Input
                    placeholder="Job title"
                    value={activeEntry.title}
                    onChange={(e) => updateEntry("title", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Job URL
                  </label>
                  <Input
                    placeholder="https://..."
                    value={activeEntry.url}
                    onChange={(e) => updateEntry("url", e.target.value)}
                    disabled={saving}
                  />
                  {urlStatus === "checking" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Checking URL...
                    </p>
                  )}
                  {urlStatus === "exists" && (
                    <p
                      className="text-sm text-red-400 mt-1"
                      aria-label="URL status"
                    >
                      Duplicate — this job already exists in the database
                    </p>
                  )}
                  {urlStatus === "new" && (
                    <p
                      className="text-sm text-green-400 mt-1"
                      aria-label="URL status"
                    >
                      New job — not in database yet
                    </p>
                  )}
                </div>
              </div>

              {/* Company Name (LinkedIn searches only) */}
              {showCompanyName && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Company Name
                  </label>
                  <Input
                    placeholder="Company that posted this job"
                    value={activeEntry.company_name}
                    onChange={(e) =>
                      updateEntry("company_name", e.target.value)
                    }
                    disabled={saving}
                  />
                </div>
              )}

              {/* Row 2: Location + Department */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Location
                  </label>
                  <Input
                    placeholder="City, Country"
                    value={activeEntry.location}
                    onChange={(e) => updateEntry("location", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Department
                  </label>
                  <Input
                    placeholder="Engineering, Marketing..."
                    value={activeEntry.department}
                    onChange={(e) => updateEntry("department", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Row 3: Work Type + Seniority */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Work Type
                  </label>
                  <select
                    value={activeEntry.work_type}
                    onChange={(e) => updateEntry("work_type", e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-transparent px-2 text-base text-foreground"
                    disabled={saving}
                  >
                    <option value="">Select type</option>
                    {WORK_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Seniority
                  </label>
                  <select
                    value={activeEntry.seniority_level}
                    onChange={(e) =>
                      updateEntry("seniority_level", e.target.value)
                    }
                    className="h-8 w-full rounded-lg border border-border bg-transparent px-2 text-base text-foreground"
                    disabled={saving}
                  >
                    <option value="">Select level</option>
                    {SENIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Salary + Skills */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Salary Range
                  </label>
                  <Input
                    placeholder="$80k-$120k"
                    value={activeEntry.salary_range}
                    onChange={(e) =>
                      updateEntry("salary_range", e.target.value)
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Skills
                  </label>
                  <Input
                    placeholder="React, TypeScript, Node.js..."
                    value={activeEntry.skills}
                    onChange={(e) => updateEntry("skills", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Row 5: Language Requirements */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Language Requirements
                </label>
                <Input
                  placeholder="e.g., English required, no German needed"
                  value={activeEntry.language_requirements}
                  onChange={(e) =>
                    updateEntry("language_requirements", e.target.value)
                  }
                  disabled={saving}
                />
              </div>

              {/* Row 6: Description */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Description Summary
                </label>
                <Textarea
                  placeholder="Brief summary of the role..."
                  value={activeEntry.description_summary}
                  onChange={(e) =>
                    updateEntry("description_summary", e.target.value)
                  }
                  className="min-h-12"
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <button
          type="button"
          onClick={handleAddJob}
          disabled={saving}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Add Job
        </button>

        {/* Hidden action triggers for Chrome extension compatibility */}
        <select
          ref={addJobRef}
          aria-label="Add Job"
          className="sr-only"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value === "add") handleAddJob();
            if (addJobRef.current) addJobRef.current.value = "";
          }}
          disabled={saving}
        >
          <option value="">Select</option>
          <option value="add">Add Job</option>
        </select>
        <select
          ref={removeJobRef}
          aria-label="Remove Job"
          className="sr-only"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value === "remove") handleRemoveJob();
            if (removeJobRef.current) removeJobRef.current.value = "";
          }}
        >
          <option value="">Select</option>
          <option value="remove">Remove Job</option>
        </select>
      </div>
    );
  },
);
