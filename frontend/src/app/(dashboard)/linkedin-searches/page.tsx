"use client";

import { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AddSearchDialog } from "@/components/linkedin-searches/add-search-dialog";
import { LinkedInSearchesTable } from "@/components/linkedin-searches/linkedin-searches-table";
import { useLinkedinSearches } from "@/hooks/use-linkedin-searches";

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {/* Header skeleton */}
      <div className="border-b border-border p-3">
        <div className="flex gap-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-border p-3 last:border-0">
          <div className="flex items-center gap-8">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LinkedInSearchesPage() {
  const {
    searches,
    loading,
    error,
    addSearch,
    updateSearch,
    deleteSearch,
    triggerScan,
  } = useLinkedinSearches();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(typeof searches)[number] | null>(null);

  const handleAddSearch = async (data: Parameters<typeof addSearch>[0]) => {
    try {
      await addSearch(data);
      toast.success("Search added", {
        description: "LinkedIn search has been added to your tracked searches.",
      });
    } catch {
      toast.error("Failed to add search", {
        description: "Something went wrong. Please try again.",
      });
      throw new Error("Failed to add search");
    }
  };

  const handleTriggerScan = async (id: number) => {
    const search = searches.find((s) => s.id === id);
    try {
      await triggerScan(id);
      toast.success("Scan task created", {
        description: `Scan task created${search?.keywords ? ` for "${search.keywords}"` : ""}.`,
      });
    } catch {
      toast.error("Failed to create scan task", {
        description: "Something went wrong. Please try again.",
      });
    }
  };

  const handleDuplicate = async (id: number) => {
    const search = searches.find((s) => s.id === id);
    if (!search) return;
    try {
      await addSearch({ keywords: search.keywords, location: search.location || "", geo_id: search.geo_id, employment_types: search.employment_types || [] });
      toast.success("Search duplicated", {
        description: `"${search.keywords}" has been duplicated.`,
      });
    } catch {
      toast.error("Failed to duplicate search", {
        description: "Something went wrong. Please try again.",
      });
    }
  };

  const handleEdit = async (data: Parameters<typeof addSearch>[0]) => {
    if (!editTarget) return;
    try {
      await updateSearch(editTarget.id, {
        keywords: data.keywords,
        location: data.location || null,
        geo_id: data.geo_id,
        employment_types: data.employment_types,
      });
      toast.success("Search updated", {
        description: `"${data.keywords}" has been updated.`,
      });
    } catch {
      toast.error("Failed to update search", {
        description: "Something went wrong. Please try again.",
      });
      throw new Error("Failed to update search");
    }
  };

  const handleDelete = async (id: number) => {
    const search = searches.find((s) => s.id === id);
    try {
      await deleteSearch(id);
      toast.success("Search deleted", {
        description: `${search?.keywords || "Search"} has been removed.`,
      });
    } catch {
      toast.error("Failed to delete search", {
        description: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="LinkedIn Searches"
        subtitle="Define keyword searches to discover job postings on LinkedIn"
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#1db954] hover:bg-[#1ed760] text-black font-semibold"
          >
            <Plus className="size-4" />
            Add Search
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error loading LinkedIn searches</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <TableSkeleton />
      ) : (
        <LinkedInSearchesTable
          searches={searches}
          onTriggerScan={handleTriggerScan}
          onDuplicate={handleDuplicate}
          onEdit={setEditTarget}
          onDelete={handleDelete}
          loading={loading}
        />
      )}

      <AddSearchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAddSearch}
      />

      <AddSearchDialog
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        onSubmit={handleEdit}
        editSearch={editTarget}
      />
    </div>
  );
}
