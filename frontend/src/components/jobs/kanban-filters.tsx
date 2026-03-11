"use client";

import { X } from "lucide-react";
import type { Company } from "@/types";
import type { JobFilters } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORK_TYPES, SENIORITY_LEVELS } from "@/lib/constants";

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

interface KanbanFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  companies: Company[];
}

export function KanbanFilters({
  filters,
  onFiltersChange,
  companies,
}: KanbanFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ""
  );

  const updateFilter = (
    key: keyof JobFilters,
    value: string | null | undefined
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="bg-card/50 rounded-lg p-3 border border-border/50 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Company filter */}
        <Select
          value={filters.company ?? ""}
          onValueChange={(val) =>
            updateFilter("company", val === "__all__" ? undefined : val)
          }
        >
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Work Type filter */}
        <Select
          value={filters.work_type ?? ""}
          onValueChange={(val) =>
            updateFilter("work_type", val === "__all__" ? undefined : val)
          }
        >
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue placeholder="Work Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {WORK_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {WORK_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Seniority filter */}
        <Select
          value={filters.seniority ?? ""}
          onValueChange={(val) =>
            updateFilter("seniority", val === "__all__" ? undefined : val)
          }
        >
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue placeholder="Seniority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Levels</SelectItem>
            {SENIORITY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {SENIORITY_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location filter */}
        <Input
          placeholder="Search location..."
          value={filters.location ?? ""}
          onChange={(e) => updateFilter("location", e.target.value || undefined)}
          className="w-[160px] h-7 text-xs"
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="xs" onClick={clearFilters}>
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
