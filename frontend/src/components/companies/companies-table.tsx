"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/companies/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MoreHorizontal,
  ExternalLink,
  Search,
  FileSearch,
  Trash2,
  ArrowUpDown,
  Building2,
} from "lucide-react";
import type { Company, TaskType } from "@/types";

interface CompaniesTableProps {
  companies: Company[];
  onCreateTask: (companyId: number, taskType: TaskType) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  loading: boolean;
}

type SortKey =
  | "name"
  | "url"
  | "careers_page_url"
  | "status"
  | "jobs_found_count"
  | "last_scanned_at";
type SortDir = "asc" | "desc";

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "Just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.length > 30 ? `${url.slice(0, 30)}...` : url;
  }
}

export function CompaniesTable({
  companies,
  onCreateTask,
  onDelete,
  loading,
}: CompaniesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const multiplier = sortDir === "asc" ? 1 : -1;

      switch (sortKey) {
        case "name":
          return multiplier * a.name.localeCompare(b.name);
        case "url":
          return multiplier * a.url.localeCompare(b.url);
        case "careers_page_url":
          return (
            multiplier *
            (a.careers_page_url || "").localeCompare(b.careers_page_url || "")
          );
        case "status":
          return multiplier * a.status.localeCompare(b.status);
        case "jobs_found_count":
          return multiplier * (a.jobs_found_count - b.jobs_found_count);
        case "last_scanned_at": {
          const aTime = a.last_scanned_at
            ? new Date(a.last_scanned_at).getTime()
            : 0;
          const bTime = b.last_scanned_at
            ? new Date(b.last_scanned_at).getTime()
            : 0;
          return multiplier * (aTime - bTime);
        }
        default:
          return 0;
      }
    });
  }, [companies, sortKey, sortDir]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await onDelete(deleteTarget.id);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (!loading && companies.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No companies yet"
        description="Add your first company to start tracking job postings from their careers page."
      />
    );
  }

  const SortableHeader = ({
    label,
    sortKeyValue,
    className,
  }: {
    label: string;
    sortKeyValue: SortKey;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => handleSort(sortKeyValue)}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </TableHead>
  );

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <SortableHeader label="Name" sortKeyValue="name" />
              <SortableHeader label="Website" sortKeyValue="url" />
              <SortableHeader
                label="Careers Page"
                sortKeyValue="careers_page_url"
              />
              <SortableHeader label="Status" sortKeyValue="status" />
              <SortableHeader
                label="Jobs Found"
                sortKeyValue="jobs_found_count"
              />
              <SortableHeader
                label="Last Scanned"
                sortKeyValue="last_scanned_at"
              />
              <TableHead>
                <span className="text-sm uppercase tracking-wider text-muted-foreground">
                  Actions
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCompanies.map((company) => (
              <TableRow key={company.id} className="border-border bg-card">
                <TableCell className="font-semibold text-foreground">
                  {company.name}
                </TableCell>
                <TableCell>
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {truncateUrl(company.url)}
                    <ExternalLink className="size-3" />
                  </a>
                </TableCell>
                <TableCell>
                  {company.careers_page_url ? (
                    <a
                      href={company.careers_page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {truncateUrl(company.careers_page_url)}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Not found
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={company.status} />
                </TableCell>
                <TableCell className="text-foreground">
                  {company.jobs_found_count}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(company.last_scanned_at)}
                </TableCell>
                <TableCell>
                  <ActionsDropdown
                    company={company}
                    onCreateTask={onCreateTask}
                    onDelete={() => setDeleteTarget(company)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {sortedCompanies.map((company) => (
          <div
            key={company.id}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  {company.name}
                </h3>
                <a
                  href={company.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-base text-primary hover:underline"
                >
                  {truncateUrl(company.url)}
                  <ExternalLink className="size-3" />
                </a>
              </div>
              <ActionsDropdown
                company={company}
                onCreateTask={onCreateTask}
                onDelete={() => setDeleteTarget(company)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
              <StatusBadge status={company.status} />
              <span className="text-muted-foreground">
                {company.jobs_found_count} jobs
              </span>
              <span className="text-muted-foreground">
                {formatRelativeTime(company.last_scanned_at)}
              </span>
            </div>

            <div className="text-base">
              {company.careers_page_url ? (
                <a
                  href={company.careers_page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {truncateUrl(company.careers_page_url)}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <span className="text-muted-foreground italic">
                  No careers page found
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Company"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove all associated jobs and tasks. This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  );
}

function ActionsDropdown({
  company,
  onCreateTask,
  onDelete,
}: {
  company: Company;
  onCreateTask: (companyId: number, taskType: TaskType) => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Open menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!company.careers_page_url && (
          <DropdownMenuItem
            onClick={() => onCreateTask(company.id, "find_careers_page")}
          >
            <Search className="size-4" />
            Find Careers Page
          </DropdownMenuItem>
        )}
        {company.careers_page_url && (
          <DropdownMenuItem
            onClick={() => onCreateTask(company.id, "scan_jobs")}
          >
            <FileSearch className="size-4" />
            Scan Jobs
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
