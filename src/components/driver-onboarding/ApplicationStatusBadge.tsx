import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/driverOnboardingTypes";
import {
  UserPlus,
  Phone,
  XCircle,
  FileText,
  CheckCircle,
  Car,
  AlertTriangle,
  Beaker,
  Clock,
  GraduationCap,
  Users,
  Award,
} from "lucide-react";

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

const statusConfig: Record<
  ApplicationStatus,
  { label: string; icon: any; className: string }
> = {
  NEW: {
    label: "New Lead",
    icon: UserPlus,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  CONTACTED: {
    label: "Contacted",
    icon: Phone,
    className: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
  DOCS_PENDING: {
    label: "Docs Pending",
    icon: FileText,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  DOCS_VERIFIED: {
    label: "Docs Verified",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  MVR_PENDING: {
    label: "MVR Pending",
    icon: Car,
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  MVR_PASSED: {
    label: "MVR Passed",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  MVR_FAILED: {
    label: "MVR Failed",
    icon: AlertTriangle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
  DRUG_TEST_ORDERED: {
    label: "Drug Test Ordered",
    icon: Beaker,
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  DRUG_TEST_PENDING: {
    label: "Drug Test Pending",
    icon: Clock,
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  DRUG_TEST_PASSED: {
    label: "Drug Test Passed",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  DRUG_TEST_FAILED: {
    label: "Drug Test Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-800 border-red-200",
  },
  DRUG_TEST_NO_SHOW: {
    label: "No Show",
    icon: AlertTriangle,
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  DRUG_TEST_EXPIRED: {
    label: "Test Expired",
    icon: Clock,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  CLEARED_FOR_HIRE: {
    label: "Cleared for Hire",
    icon: Award,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  ORIENTATION_SCHEDULED: {
    label: "Orientation Scheduled",
    icon: Users,
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  ORIENTATION_COMPLETED: {
    label: "Orientation Done",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  TRAINING_IN_PROGRESS: {
    label: "In Training",
    icon: GraduationCap,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  TRAINING_COMPLETED: {
    label: "Training Done",
    icon: CheckCircle,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  HIRED: {
    label: "Hired",
    icon: Award,
    className: "bg-green-500 text-white border-green-600",
  },
};

export const ApplicationStatusBadge = ({
  status,
  className = "",
}: ApplicationStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.NEW;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className} flex items-center gap-1 px-2 py-1`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
};

