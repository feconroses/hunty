import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CompanyStatus } from "@/types";

interface StatusBadgeProps {
  status: CompanyStatus;
  className?: string;
}

const statusConfig: Record<
  CompanyStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/25",
  },
  active: {
    label: "Active",
    className: "bg-[#1db954]/15 text-[#1db954] border-[#1db954]/25",
  },
  error: {
    label: "Error",
    className: "bg-red-500/15 text-red-500 border-red-500/25",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
