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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MoreHorizontal,
  ExternalLink,
  Trash2,
  ArrowUpDown,
  Search,
  Play,
  Copy,
  Pencil,
} from "lucide-react";
import type { LinkedInSearch } from "@/types";

interface LinkedInSearchesTableProps {
  searches: LinkedInSearch[];
  onTriggerScan: (id: number) => void;
  onDuplicate: (id: number) => void;
  onEdit: (search: LinkedInSearch) => void;
  onDelete: (id: number) => void;
  loading: boolean;
}

type SortKey =
  | "keywords"
  | "location"
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

function getSearchDisplayName(search: LinkedInSearch): string {
  return `${search.keywords} — ${search.location || "Any location"}`;
}

export function LinkedInSearchesTable({
  searches,
  onTriggerScan,
  onDuplicate,
  onEdit,
  onDelete,
  loading,
}: LinkedInSearchesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("keywords");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleteTarget, setDeleteTarget] = useState<LinkedInSearch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedSearches = useMemo(() => {
    return [...searches].sort((a, b) => {
      const multiplier = sortDir === "asc" ? 1 : -1;

      switch (sortKey) {
        case "keywords":
          return multiplier * a.keywords.localeCompare(b.keywords);
        case "location":
          return (
            multiplier *
            (a.location || "").localeCompare(b.location || "")
          );
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
  }, [searches, sortKey, sortDir]);

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

  if (!loading && searches.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No LinkedIn searches yet"
        description="Add your first LinkedIn search to start discovering jobs from LinkedIn."
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
              <SortableHeader label="Keywords" sortKeyValue="keywords" />
              <SortableHeader label="Location" sortKeyValue="location" />
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
            {sortedSearches.map((search) => (
              <TableRow key={search.id} className="border-border bg-card">
                <TableCell className="font-semibold text-foreground">
                  {search.linkedin_url ? (
                    <a
                      href={search.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {search.keywords}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    search.keywords
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {search.location || "Any"}
                </TableCell>
                <TableCell className="text-foreground">
                  {search.jobs_found_count}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(search.last_scanned_at)}
                </TableCell>
                <TableCell>
                  <ActionsDropdown
                    search={search}
                    onTriggerScan={onTriggerScan}
                    onDuplicate={onDuplicate}
                    onEdit={onEdit}
                    onDelete={() => setDeleteTarget(search)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {sortedSearches.map((search) => (
          <div
            key={search.id}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  {search.linkedin_url ? (
                    <a
                      href={search.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {getSearchDisplayName(search)}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    getSearchDisplayName(search)
                  )}
                </h3>
                <p className="text-base text-muted-foreground">
                  {search.keywords}
                  {search.location ? ` · ${search.location}` : ""}
                </p>
              </div>
              <ActionsDropdown
                search={search}
                onTriggerScan={onTriggerScan}
                onDuplicate={onDuplicate}
                onEdit={onEdit}
                onDelete={() => setDeleteTarget(search)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base">
              <span className="text-muted-foreground">
                {search.jobs_found_count} jobs
              </span>
              <span className="text-muted-foreground">
                {formatRelativeTime(search.last_scanned_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete LinkedIn Search"
        description={`Are you sure you want to delete "${deleteTarget ? getSearchDisplayName(deleteTarget) : ""}"? This will also remove all associated jobs and tasks. This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  );
}

function ActionsDropdown({
  search,
  onTriggerScan,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  search: LinkedInSearch;
  onTriggerScan: (id: number) => void;
  onDuplicate: (id: number) => void;
  onEdit: (search: LinkedInSearch) => void;
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
        <DropdownMenuItem onClick={() => onTriggerScan(search.id)}>
          <Play className="size-4" />
          Scan Now
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(search.id)}>
          <Copy className="size-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(search)}>
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
