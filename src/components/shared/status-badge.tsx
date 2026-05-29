import { CheckCircle2, Clock3, XCircle, FileText, MessageSquareDiff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/database";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ElementType; classes: string }
> = {
  draft: {
    label: "Draft",
    icon: FileText,
    classes: "bg-slate-100 text-slate-600 border-slate-200",
  },
  pending_approval: {
    label: "Pending Approval",
    icon: Clock3,
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    classes: "bg-rose-50 text-rose-700 border-rose-200",
  },
  needs_revisions: {
    label: "Needs Revisions",
    icon: MessageSquareDiff,
    classes: "bg-orange-50 text-orange-700 border-orange-200",
  },
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const { label, icon: Icon, classes } = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        classes,
        className
      )}
    >
      {showIcon && (
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
