import type { TicketStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Truck, Package } from "lucide-react";

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

const statusConfig = {
  CREATED: {
    label: "Created",
    icon: Clock,
    className: "bg-warning text-warning-foreground",
  },
  VERIFIED: {
    label: "Verified",
    icon: CheckCircle,
    className: "bg-status-verified text-white",
  },
  DELIVERED: {
    label: "Delivered",
    icon: Truck,
    className: "bg-primary text-primary-foreground",
  },
  CLOSED: {
    label: "Closed",
    icon: Package,
    className: "bg-success text-success-foreground",
  },
};

export const StatusBadge = ({ status, className = "" }: StatusBadgeProps) => {
  const config = statusConfig[status] || {
    label: status || "Unknown",
    icon: Package,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  const Icon = config.icon;

  return (
    <Badge
      className={`${config.className} ${className} gap-1.5 px-3 py-1.5 font-semibold`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};
