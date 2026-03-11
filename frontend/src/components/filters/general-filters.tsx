"use client";

import { useCallback, useMemo } from "react";
import { Trash2 } from "lucide-react";
import type { FilterRule, FilterRuleType } from "@/types";
import { SENIORITY_LEVELS, WORK_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { KeywordInput } from "./keyword-input";

// ─── Value encoding helpers ─────────────────────────────────────────────────
// Filter values are stored as "category:actual_value"
// e.g. "title:engineer", "seniority:senior", "work_type:remote"

function encodeValue(category: string, val: string): string {
  return `${category}:${val}`;
}

function decodeValue(encoded: string): { category: string; val: string } {
  const idx = encoded.indexOf(":");
  if (idx === -1) return { category: "free_text", val: encoded };
  return { category: encoded.slice(0, idx), val: encoded.slice(idx + 1) };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  executive: "Executive",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface GeneralFiltersProps {
  filters: FilterRule[];
  onCreate: (data: Partial<FilterRule>) => Promise<FilterRule>;
  onDelete: (id: number) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GeneralFilters({
  filters,
  onCreate,
  onDelete,
}: GeneralFiltersProps) {
  // ── Derived data ──────────────────────────────────────────────────────────

  const byCategory = useMemo(() => {
    const map: Record<string, { rule: FilterRule; val: string }[]> = {};
    for (const f of filters) {
      const { category, val } = decodeValue(f.value);
      const key = `${category}_${f.rule_type}`;
      if (!map[key]) map[key] = [];
      map[key].push({ rule: f, val });
    }
    return map;
  }, [filters]);

  const getKeywords = useCallback(
    (category: string, ruleType: FilterRuleType): string[] => {
      return (byCategory[`${category}_${ruleType}`] || []).map((e) => e.val);
    },
    [byCategory],
  );

  const getRules = useCallback(
    (category: string, ruleType: FilterRuleType) => {
      return byCategory[`${category}_${ruleType}`] || [];
    },
    [byCategory],
  );

  // ── Keyword change handlers ───────────────────────────────────────────────

  const handleKeywordsChange = useCallback(
    async (
      category: string,
      ruleType: FilterRuleType,
      newValues: string[],
    ) => {
      const existing = getRules(category, ruleType);
      const existingVals = existing.map((e) => e.val);

      // Find added values
      const added = newValues.filter((v) => !existingVals.includes(v));
      // Find removed values
      const removed = existing.filter((e) => !newValues.includes(e.val));

      // Create new rules
      for (const val of added) {
        await onCreate({
          company_id: null,
          rule_type: ruleType,
          value: encodeValue(category, val),
        });
      }

      // Delete removed rules
      for (const entry of removed) {
        await onDelete(entry.rule.id);
      }
    },
    [getRules, onCreate, onDelete],
  );

  // ── Checkbox change handlers ──────────────────────────────────────────────

  const handleCheckboxChange = useCallback(
    async (category: string, val: string, checked: boolean) => {
      if (checked) {
        await onCreate({
          company_id: null,
          rule_type: "include",
          value: encodeValue(category, val),
        });
      } else {
        const existing = getRules(category, "include");
        const match = existing.find((e) => e.val === val);
        if (match) {
          await onDelete(match.rule.id);
        }
      }
    },
    [getRules, onCreate, onDelete],
  );

  // ── Salary handler ────────────────────────────────────────────────────────

  const currentSalary = useMemo(() => {
    const entries = getRules("min_salary", "include");
    return entries.length > 0 ? entries[0] : null;
  }, [getRules]);

  const handleSalaryChange = useCallback(
    async (val: string) => {
      // Remove existing salary rule
      if (currentSalary) {
        await onDelete(currentSalary.rule.id);
      }
      // Create new one if value is non-empty
      if (val && Number(val) > 0) {
        await onCreate({
          company_id: null,
          rule_type: "include",
          value: encodeValue("min_salary", val),
        });
      }
    },
    [currentSalary, onCreate, onDelete],
  );

  // ── Free-text handler ─────────────────────────────────────────────────────

  const currentFreeText = useMemo(() => {
    const entries = getRules("free_text", "include");
    return entries.length > 0 ? entries[0] : null;
  }, [getRules]);

  const handleFreeTextSave = useCallback(
    async (val: string) => {
      if (currentFreeText) {
        await onDelete(currentFreeText.rule.id);
      }
      if (val.trim()) {
        await onCreate({
          company_id: null,
          rule_type: "include",
          value: encodeValue("free_text", val.trim()),
        });
      }
    },
    [currentFreeText, onCreate, onDelete],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Title Keywords (Include) */}
      <div>
        <KeywordInput
          label="Title Keywords (Include)"
          value={getKeywords("title", "include")}
          onChange={(vals) => handleKeywordsChange("title", "include", vals)}
          placeholder="e.g. Engineer, Developer, Designer"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Jobs with these words in the title will be included
        </p>
      </div>

      <Separator />

      {/* Title Keywords (Exclude) */}
      <div>
        <KeywordInput
          label="Title Keywords (Exclude)"
          value={getKeywords("title", "exclude")}
          onChange={(vals) => handleKeywordsChange("title", "exclude", vals)}
          placeholder="e.g. Intern, Manager, Director"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Jobs with these words in the title will be excluded
        </p>
      </div>

      <Separator />

      {/* Description Keywords */}
      <div>
        <KeywordInput
          label="Description Keywords"
          value={getKeywords("description", "include")}
          onChange={(vals) =>
            handleKeywordsChange("description", "include", vals)
          }
          placeholder="e.g. React, Python, TypeScript"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Jobs must mention these keywords in their description
        </p>
      </div>

      <Separator />

      {/* Locations */}
      <div>
        <KeywordInput
          label="Locations"
          value={getKeywords("location", "include")}
          onChange={(vals) =>
            handleKeywordsChange("location", "include", vals)
          }
          placeholder="e.g. San Francisco, New York, London"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Only show jobs from these locations
        </p>
      </div>

      <Separator />

      {/* Seniority Levels */}
      <div className="space-y-2">
        <Label>Seniority Levels</Label>
        <div className="flex flex-wrap gap-4">
          {SENIORITY_LEVELS.map((level) => {
            const isChecked = getKeywords("seniority", "include").includes(
              level,
            );
            return (
              <label
                key={level}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange("seniority", level, checked === true)
                  }
                />
                {SENIORITY_LABELS[level]}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Only show jobs matching these seniority levels
        </p>
      </div>

      <Separator />

      {/* Work Type */}
      <div className="space-y-2">
        <Label>Work Type</Label>
        <div className="flex flex-wrap gap-4">
          {WORK_TYPES.map((wt) => {
            const isChecked = getKeywords("work_type", "include").includes(wt);
            return (
              <label
                key={wt}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange("work_type", wt, checked === true)
                  }
                />
                {WORK_TYPE_LABELS[wt]}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Only show jobs matching these work arrangements
        </p>
      </div>

      <Separator />

      {/* Minimum Salary */}
      <div className="space-y-1.5">
        <Label htmlFor="min-salary">Minimum Salary</Label>
        <div className="flex items-center gap-2">
          <Input
            id="min-salary"
            type="number"
            min={0}
            step={1000}
            placeholder="e.g. 80000"
            defaultValue={currentSalary?.val ?? ""}
            className="w-48"
            onBlur={(e) => handleSalaryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSalaryChange(e.currentTarget.value);
              }
            }}
          />
          {currentSalary && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(currentSalary.rule.id)}
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Exclude jobs below this annual salary
        </p>
      </div>

      <Separator />

      {/* Free-text Criteria */}
      <div className="space-y-1.5">
        <Label htmlFor="free-text">Free-text Criteria</Label>
        <Textarea
          id="free-text"
          placeholder="Describe additional criteria in natural language, e.g. 'I prefer companies with 50-500 employees that use modern tech stacks...'"
          defaultValue={currentFreeText?.val ?? ""}
          rows={3}
          onBlur={(e) => handleFreeTextSave(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Additional instructions for the AI when evaluating job relevance
        </p>
      </div>
    </div>
  );
}
