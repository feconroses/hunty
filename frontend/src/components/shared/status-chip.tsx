import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "pending" | "active" | "error" | "completed" | "failed";

interface StatusChipProps {
  status: Status;
  label?: string;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  pending:
    "bg-yellow-500/15 text-yellow-500 border-yellow-500/25",
  active:
    "bg-[#1db954]/15 text-[#1db954] border-[#1db954]/25",
  completed:
    "bg-[#1db954]/15 text-[#1db954] border-[#1db954]/25",
  error:
    "bg-red-500/15 text-red-500 border-red-500/25",
  failed:
    "bg-red-500/15 text-red-500 border-red-500/25",
};

const statusLabels: Record<Status, string> = {
  pending: "Pending",
  active: "Active",
  error: "Error",
  completed: "Completed",
  failed: "Failed",
};

export function StatusChip({ status, label, className }: StatusChipProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status], className)}
    >
      {label || statusLabels[status]}
    </Badge>
  );
}
