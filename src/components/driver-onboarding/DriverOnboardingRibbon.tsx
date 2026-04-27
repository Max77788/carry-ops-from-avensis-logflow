import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Phone,
  FileText,
  Shield,
  GraduationCap,
  UserCheck,
  ClipboardCheck,
  Syringe,
} from "lucide-react";
import type { ApplicationWithDetails } from "@/lib/driverOnboardingTypes";

interface DriverOnboardingRibbonProps {
  application: ApplicationWithDetails;
}

export const DriverOnboardingRibbon = ({
  application,
}: DriverOnboardingRibbonProps) => {
  const getStatusBadge = (isComplete: boolean, inProgress: boolean) => {
    if (isComplete) {
      return <Badge className="bg-green-500 text-white">Complete</Badge>;
    }
    if (inProgress) {
      return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
    }
    return <Badge className="bg-gray-500 text-white">Not Started</Badge>;
  };

  // Define onboarding stages based on application status
  const stages = [
    {
      id: "verification",
      label: "Initial Connect",
      icon: Phone,
      isComplete: !!application.application.initial_verification_call_at,
      inProgress: application.application.status === "NEW",
      subtitle: application.application.initial_verification_call_at
        ? "Contacted"
        : "Not contacted",
    },
    {
      id: "documents",
      label: "Documents",
      icon: FileText,
      isComplete:
        application.application.status !== "NEW" &&
        application.application.status !== "CONTACTED" &&
        application.application.status !== "REJECTED" &&
        application.application.status !== "DOCS_PENDING" &&
        application.compliance?.drivers_license_verified &&
        application.compliance?.medical_card_verified &&
        application.compliance?.ssn_verified,
      inProgress:
        application.application.status === "DOCS_PENDING" ||
        (application.application.status === "CONTACTED" &&
          (application.compliance?.drivers_license_url ||
            application.compliance?.medical_card_url ||
            application.compliance?.ssn_url)),
      subtitle:
        application.compliance?.drivers_license_verified &&
        application.compliance?.medical_card_verified &&
        application.compliance?.ssn_verified
          ? "All verified"
          : "Pending",
    },
    {
      id: "mvr",
      label: "MVR Record",
      icon: ClipboardCheck,
      isComplete: application.compliance?.mvr_eligible === true,
      inProgress:
        application.compliance?.mvr_requested_at &&
        !application.compliance?.mvr_completed_at,
      subtitle: application.compliance?.mvr_eligible
        ? "Passed"
        : application.compliance?.mvr_completed_at
        ? "Failed"
        : application.compliance?.mvr_requested_at
        ? "In progress"
        : "Not started",
    },
    {
      id: "drug_test",
      label: "Drug Test",
      icon: Syringe,
      isComplete: application.compliance?.drug_test_result === "NEGATIVE",
      inProgress:
        application.compliance?.drug_test_ordered_at &&
        !application.compliance?.drug_test_result,
      subtitle:
        application.compliance?.drug_test_result === "NEGATIVE"
          ? "Passed"
          : application.compliance?.drug_test_result === "POSITIVE"
          ? "Failed"
          : application.compliance?.drug_test_result === "NO_SHOW"
          ? "No Show"
          : application.compliance?.drug_test_result === "EXPIRED"
          ? "Expired"
          : application.compliance?.drug_test_ordered_at
          ? "In progress"
          : "Not started",
    },
    {
      id: "orientation",
      label: "Orientation",
      icon: GraduationCap,
      isComplete: !!application.onboarding?.orientation_completed_at,
      inProgress:
        !!application.onboarding?.orientation_scheduled_at &&
        !application.onboarding?.orientation_completed_at,
      subtitle: application.onboarding?.orientation_completed_at
        ? "Completed"
        : application.onboarding?.orientation_scheduled_at
        ? "Scheduled"
        : "Not scheduled",
    },
  ];

  return (
    <Card className="p-8 mb-6">
      <h3 className="text-lg font-semibold mb-8 text-center">
        Onboarding Progress
      </h3>

      {/* Timeline Ribbon */}
      <div className="relative">
        {/* Connecting Line */}
        <div
          className="absolute top-6 left-0 right-0 h-0.5 bg-border"
          style={{ left: "5%", right: "5%" }}
        />

        {/* Stages */}
        <div className="relative flex justify-between items-start">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className="flex flex-col items-center"
                style={{ flex: 1 }}
              >
                {/* Circle */}
                <div className="relative z-10 mb-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all ${
                      stage.isComplete
                        ? "bg-green-500 border-green-500"
                        : stage.inProgress
                        ? "bg-blue-500 border-blue-500"
                        : "bg-background border-border"
                    }`}
                  >
                    {stage.isComplete ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : stage.inProgress ? (
                      <Icon className="h-6 w-6 text-white" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Label */}
                <div className="text-center max-w-[120px]">
                  <p
                    className={`font-medium text-sm mb-1 ${
                      stage.isComplete ? "text-green-600" : ""
                    }`}
                  >
                    {stage.label}
                  </p>
                  {stage.subtitle && (
                    <p
                      className={`text-xs ${
                        stage.isComplete
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {stage.subtitle}
                    </p>
                  )}
                  <div className="mt-2">
                    {getStatusBadge(stage.isComplete, stage.inProgress)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
