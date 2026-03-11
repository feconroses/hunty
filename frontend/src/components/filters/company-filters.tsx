"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Building2, ChevronDown, ChevronRight } from "lucide-react";
import type { FilterRule, FilterRuleType, Company } from "@/types";
import { SENIORITY_LEVELS, WORK_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeywordInput } from "./keyword-input";

// ─── Value encoding helpers ─────────────────────────────────────────────────

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

interface CompanyFiltersProps {
  filters: FilterRule[];
  companies: Company[];
  onCreate: (data: Partial<FilterRule>) => Promise<FilterRule>;
  onDelete: (id: number) => Promise<void>;
}

// ─── Company Filter Group ───────────────────────────────────────────────────

interface CompanyFilterGroupProps {
  companyId: number;
  companyName: string;
  rules: FilterRule[];
  onCreate: (data: Partial<FilterRule>) => Promise<FilterRule>;
  onDelete: (id: number) => Promise<void>;
  onDeleteAll: () => Promise<void>;
}

function CompanyFilterGroup({
  companyId,
  companyName,
  rules,
  onCreate,
  onDelete,
  onDeleteAll,
}: CompanyFilterGroupProps) {
  const [expanded, setExpanded] = useState(true);

  const byCategory = useMemo(() => {
    const map: Record<string, { rule: FilterRule; val: string }[]> = {};
    for (const f of rules) {
      const { category, val } = decodeValue(f.value);
      const key = `${category}_${f.rule_type}`;
      if (!map[key]) map[key] = [];
      map[key].push({ rule: f, val });
    }
    return map;
  }, [rules]);

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

  const handleKeywordsChange = useCallback(
    async (
      category: string,
      ruleType: FilterRuleType,
      newValues: string[],
    ) => {
      const existing = getRules(category, ruleType);
      const existingVals = existing.map((e) => e.val);

      const added = newValues.filter((v) => !existingVals.includes(v));
      const removed = existing.filter((e) => !newValues.includes(e.val));

      for (const val of added) {
        await onCreate({
          company_id: companyId,
          rule_type: ruleType,
          value: encodeValue(category, val),
        });
      }

      for (const entry of removed) {
        await onDelete(entry.rule.id);
      }
    },
    [companyId, getRules, onCreate, onDelete],
  );

  const handleCheckboxChange = useCallback(
    async (category: string, val: string, checked: boolean) => {
      if (checked) {
        await onCreate({
          company_id: companyId,
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
    [companyId, getRules, onCreate, onDelete],
  );

  const currentSalary = useMemo(() => {
    const entries = getRules("min_salary", "include");
    return entries.length > 0 ? entries[0] : null;
  }, [getRules]);

  const handleSalaryChange = useCallback(
    async (val: string) => {
      if (currentSalary) {
        await onDelete(currentSalary.rule.id);
      }
      if (val && Number(val) > 0) {
        await onCreate({
          company_id: companyId,
          rule_type: "include",
          value: encodeValue("min_salary", val),
        });
      }
    },
    [companyId, currentSalary, onCreate, onDelete],
  );

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
          company_id: companyId,
          rule_type: "include",
          value: encodeValue("free_text", val.trim()),
        });
      }
    },
    [companyId, currentFreeText, onCreate, onDelete],
  );

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-base font-medium hover:text-foreground/80"
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          <Building2 className="size-4 text-muted-foreground" />
          {companyName}
          <span className="text-sm text-muted-foreground font-normal">
            ({rules.length} rule{rules.length !== 1 ? "s" : ""})
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDeleteAll}
          title="Remove all rules for this company"
        >
          <Trash2 className="size-3.5 text-muted-foreground" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-5">
          {/* Title Keywords (Include) */}
          <KeywordInput
            label="Title Keywords (Include)"
            value={getKeywords("title", "include")}
            onChange={(vals) => handleKeywordsChange("title", "include", vals)}
            placeholder="e.g. Engineer, Developer"
          />

          <Separator />

          {/* Title Keywords (Exclude) */}
          <KeywordInput
            label="Title Keywords (Exclude)"
            value={getKeywords("title", "exclude")}
            onChange={(vals) => handleKeywordsChange("title", "exclude", vals)}
            placeholder="e.g. Intern, Manager"
          />

          <Separator />

          {/* Description Keywords */}
          <KeywordInput
            label="Description Keywords"
            value={getKeywords("description", "include")}
            onChange={(vals) =>
              handleKeywordsChange("description", "include", vals)
            }
            placeholder="e.g. React, Python"
          />

          <Separator />

          {/* Locations */}
          <KeywordInput
            label="Locations"
            value={getKeywords("location", "include")}
            onChange={(vals) =>
              handleKeywordsChange("location", "include", vals)
            }
            placeholder="e.g. San Francisco, Remote"
          />

          <Separator />

          {/* Seniority Levels */}
          <div className="space-y-2">
            <Label>Seniority Levels</Label>
            <div className="flex flex-wrap gap-4">
              {SENIORITY_LEVELS.map((level) => {
                const isChecked = getKeywords(
                  "seniority",
                  "include",
                ).includes(level);
                return (
                  <label
                    key={level}
                    className="flex items-center gap-2 text-base cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "seniority",
                          level,
                          checked === true,
                        )
                      }
                    />
                    {SENIORITY_LABELS[level]}
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Work Type */}
          <div className="space-y-2">
            <Label>Work Type</Label>
            <div className="flex flex-wrap gap-4">
              {WORK_TYPES.map((wt) => {
                const isChecked = getKeywords(
                  "work_type",
                  "include",
                ).includes(wt);
                return (
                  <label
                    key={wt}
                    className="flex items-center gap-2 text-base cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "work_type",
                          wt,
                          checked === true,
                        )
                      }
                    />
                    {WORK_TYPE_LABELS[wt]}
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Minimum Salary */}
          <div className="space-y-1.5">
            <Label>Minimum Salary</Label>
            <div className="flex items-center gap-2">
              <Input
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
          </div>

          <Separator />

          {/* Free-text Criteria */}
          <div className="space-y-1.5">
            <Label>Free-text Criteria</Label>
            <Textarea
              placeholder="Additional criteria specific to this company..."
              defaultValue={currentFreeText?.val ?? ""}
              rows={3}
              onBlur={(e) => handleFreeTextSave(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CompanyFilters({
  filters,
  companies,
  onCreate,
  onDelete,
}: CompanyFiltersProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Group filters by company_id
  const grouped = useMemo(() => {
    const map: Record<string, FilterRule[]> = {};
    for (const f of filters) {
      if (f.company_id) {
        if (!map[f.company_id]) map[f.company_id] = [];
        map[f.company_id].push(f);
      }
    }
    return map;
  }, [filters]);

  const companyIds = useMemo(() => Object.keys(grouped), [grouped]);

  // Companies that don't already have overrides
  const availableCompanies = useMemo(
    () => companies.filter((c) => !companyIds.includes(String(c.id))),
    [companies, companyIds],
  );

  const getCompanyName = useCallback(
    (id: string) => {
      const company = companies.find((c) => String(c.id) === id);
      return company?.name ?? "Unknown Company";
    },
    [companies],
  );

  const handleAddOverride = useCallback(async () => {
    if (!selectedCompanyId) return;
    // Create a placeholder rule so the group appears
    await onCreate({
      company_id: Number(selectedCompanyId),
      rule_type: "include",
      value: encodeValue("free_text", ""),
    });
    setSelectedCompanyId("");
  }, [selectedCompanyId, onCreate]);

  const handleDeleteAll = useCallback(
    async (companyId: string) => {
      const rules = grouped[companyId] || [];
      for (const rule of rules) {
        await onDelete(rule.id);
      }
    },
    [grouped, onDelete],
  );

  return (
    <div className="space-y-4">
      {/* Add Company Override */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label>Add Company Override</Label>
          <Select
            value={selectedCompanyId}
            onValueChange={(value) => setSelectedCompanyId(value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a company..." />
            </SelectTrigger>
            <SelectContent>
              {availableCompanies.length === 0 ? (
                <SelectItem value="_none" disabled>
                  No companies available
                </SelectItem>
              ) : (
                availableCompanies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleAddOverride}
          disabled={!selectedCompanyId}
          variant="outline"
          className="shrink-0"
        >
          <Plus className="size-4" />
          Add Override
        </Button>
      </div>

      {companyIds.length === 0 && (
        <p className="py-6 text-center text-base text-muted-foreground">
          No company-specific filter overrides yet. Add one above to customize
          filtering for a specific company.
        </p>
      )}

      {/* Company groups */}
      <div className="space-y-3">
        {companyIds.map((companyId) => (
          <CompanyFilterGroup
            key={companyId}
            companyId={Number(companyId)}
            companyName={getCompanyName(companyId)}
            rules={grouped[companyId]}
            onCreate={onCreate}
            onDelete={onDelete}
            onDeleteAll={() => handleDeleteAll(companyId)}
          />
        ))}
      </div>
    </div>
  );
}
