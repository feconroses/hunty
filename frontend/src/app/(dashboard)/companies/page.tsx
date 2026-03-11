"use client";

import { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AddCompanyDialog } from "@/components/companies/add-company-dialog";
import { CompaniesTable } from "@/components/companies/companies-table";
import { useCompanies } from "@/hooks/use-companies";
import type { TaskType } from "@/types";

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

export default function CompaniesPage() {
  const {
    companies,
    loading,
    error,
    addCompany,
    deleteCompany,
    createTask,
  } = useCompanies();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddCompany = async (name: string, url: string) => {
    try {
      await addCompany(name, url);
      toast.success("Company added", {
        description: `${name} has been added to your tracked companies.`,
      });
    } catch {
      toast.error("Failed to add company", {
        description: "Something went wrong. Please try again.",
      });
      throw new Error("Failed to add company");
    }
  };

  const handleCreateTask = async (companyId: number, taskType: TaskType) => {
    const company = companies.find((c) => c.id === companyId);
    const taskLabel =
      taskType === "find_careers_page" ? "Find Careers Page" : "Scan Jobs";
    try {
      await createTask(companyId, taskType);
      toast.success("Task created", {
        description: `"${taskLabel}" task created${company ? ` for ${company.name}` : ""}.`,
      });
    } catch {
      toast.error("Failed to create task", {
        description: "Something went wrong. Please try again.",
      });
    }
  };

  const handleDelete = async (id: number) => {
    const company = companies.find((c) => c.id === id);
    try {
      await deleteCompany(id);
      toast.success("Company deleted", {
        description: `${company?.name || "Company"} has been removed.`,
      });
    } catch {
      toast.error("Failed to delete company", {
        description: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        subtitle="Manage the companies you're tracking"
        actions={
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#1db954] hover:bg-[#1ed760] text-black font-semibold"
          >
            <Plus className="size-4" />
            Add Company
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error loading companies</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <TableSkeleton />
      ) : (
        <CompaniesTable
          companies={companies}
          onCreateTask={handleCreateTask}
          onDelete={handleDelete}
          loading={loading}
        />
      )}

      <AddCompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAddCompany}
      />
    </div>
  );
}
