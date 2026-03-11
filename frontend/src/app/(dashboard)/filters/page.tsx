"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import type { FilterRule } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useFilters } from "@/hooks/use-filters";
import { useCompanies } from "@/hooks/use-companies";
import { GeneralFilters } from "@/components/filters/general-filters";
import { CompanyFilters } from "@/components/filters/company-filters";
import { FilterPreview } from "@/components/filters/filter-preview";

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function FiltersSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function FiltersPage() {
  const {
    loading,
    error,
    generalFilters,
    companyFilters,
    createFilter,
    deleteFilter,
    getFilterPrompt,
  } = useFilters();

  const { companies } = useCompanies();

  const [previewOpen, setPreviewOpen] = useState(false);

  // Flatten companyFilters grouped record into a flat array
  const allCompanyFilters = Object.values(companyFilters).flat();

  // ── Handlers with toasts ────────────────────────────────────────────────

  const handleCreateFilter = async (
    data: Partial<FilterRule>,
  ): Promise<FilterRule> => {
    try {
      const result = await createFilter(data);
      toast.success("Filter added", {
        description: "New filter rule has been created.",
      });
      return result;
    } catch {
      toast.error("Failed to add filter", {
        description: "Something went wrong. Please try again.",
      });
      throw new Error("Failed to create filter");
    }
  };

  const handleDeleteFilter = async (id: number): Promise<void> => {
    try {
      await deleteFilter(id);
      toast.success("Filter removed", {
        description: "The filter rule has been deleted.",
      });
    } catch {
      toast.error("Failed to remove filter", {
        description: "Something went wrong. Please try again.",
      });
      throw new Error("Failed to delete filter");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Filters"
        subtitle="Define criteria for job relevance"
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error loading filters</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <FiltersSkeleton />
      ) : (
        <div className="space-y-6">
          {/* General Filters */}
          <Card>
            <CardHeader>
              <CardTitle>General Filters</CardTitle>
              <CardDescription>
                Rules applied to all jobs across every company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralFilters
                filters={generalFilters}
                onCreate={handleCreateFilter}
                onDelete={handleDeleteFilter}
              />
            </CardContent>
          </Card>

          {/* Company-Specific Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Company-Specific Filters</CardTitle>
              <CardDescription>
                Override or extend general filters for specific companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyFilters
                filters={allCompanyFilters}
                companies={companies}
                onCreate={handleCreateFilter}
                onDelete={handleDeleteFilter}
              />
            </CardContent>
          </Card>

          {/* Prompt Preview (Collapsible) */}
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="flex w-full items-center gap-2 text-left"
              >
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="size-4 text-muted-foreground" />
                    Prompt Preview
                  </CardTitle>
                  <CardDescription className="mt-1">
                    See the generated AI prompt based on your filter rules
                  </CardDescription>
                </div>
                {previewOpen ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {previewOpen && (
              <>
                <Separator />
                <CardContent className="pt-4">
                  <FilterPreview
                    companies={companies}
                    getFilterPrompt={getFilterPrompt}
                  />
                </CardContent>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
