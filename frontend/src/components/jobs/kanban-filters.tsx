"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Company } from "@/types";
import type { JobFilters } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  WORK_TYPES,
  IC_SENIORITY_LEVELS,
  MANAGEMENT_SENIORITY_LEVELS,
  SENIORITY_LABELS,
} from "@/lib/constants";

const WORK_TYPE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
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
  const [localLocation, setLocalLocation] = useState(filters.location ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync local state when filters change externally (e.g., Clear button)
  useEffect(() => {
    setLocalLocation(filters.location ?? "");
  }, [filters.location]);

  // Debounce location filter
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const value = localLocation.trim() || undefined;
      if (value !== (filters.location || undefined)) {
        onFiltersChange({ ...filters, location: value });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Only re-run when localLocation changes, not when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localLocation]);

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
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="Seniority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Levels</SelectItem>
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

        {/* Location filter (debounced) */}
        <Input
          placeholder="Search location..."
          value={localLocation}
          onChange={(e) => setLocalLocation(e.target.value)}
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
