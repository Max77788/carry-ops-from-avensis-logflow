import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Mail } from "lucide-react";
import { adminService, Company } from "@/lib/adminService";

interface OnboardingRibbonProps {
  company: Company;
}

export const OnboardingRibbon = ({ company }: OnboardingRibbonProps) => {
  const [stats, setStats] = useState({
    trucks_count: 0,
    drivers_count: 0,
    trailers_count: 0,
    contacts_count: 0,
    destination_sites_count: 0,
    pickup_sites_count: 0,
  });

  useEffect(() => {
    loadStats();
  }, [company.id]);

  const loadStats = async () => {
    const statsData = await adminService.getCompanyStats(company.id);
    setStats(statsData);
  };

  // Check if onboarding is submitted or active - if so, show all as complete
  const isOnboardingSubmitted = company.status === "Onboarding Submitted";
  const isActive = company.status === "Active";
  const isOnboardingComplete = isOnboardingSubmitted || isActive;

  const getStatusBadge = (status: string, isComplete: boolean) => {
    // Sync badge color with icon status
    if (isComplete) {
      return <Badge className="bg-green-500 text-white">Complete</Badge>;
    }

    switch (status) {
      case "In Progress":
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case "Not Started":
        return <Badge className="bg-red-500 text-white">Not Started</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>;
    }
  };

  // Define onboarding stages
  const stages = [
    {
      id: "email_sent",
      label: "Email Sent",
      status: company.first_onboarding_email_sent_at
        ? "Complete"
        : "Not Started",
      isComplete: !!company.first_onboarding_email_sent_at,
      subtitle: company.first_onboarding_email_sent_at
        ? new Date(company.first_onboarding_email_sent_at).toLocaleDateString()
        : "Not sent",
      icon: "mail",
    },
    {
      id: "agreement",
      label: "Agreement",
      status: company.agreement_status,
      isComplete:
        isOnboardingComplete ||
        company.agreement_status === "Complete" ||
        company.agreement_status === "Accepted",
      subtitle:
        isOnboardingComplete ||
        company.agreement_status === "Complete" ||
        company.agreement_status === "Accepted"
          ? "Accepted"
          : "Not accepted",
    },
    {
      id: "company_details",
      label: "Company Details",
      status: company.company_details_status,
      isComplete:
        isOnboardingComplete || company.company_details_status === "Complete",
      subtitle: "",
    },
    {
      id: "contacts",
      label: "Contacts",
      status: company.contacts_status,
      isComplete: isOnboardingComplete || stats.contacts_count > 0, // Green if count > 0
      subtitle: `${stats.contacts_count} contact(s)`,
    },
    {
      id: "fleet",
      label: "Fleet",
      status: company.fleet_status,
      isComplete: isOnboardingComplete || stats.trucks_count > 0, // Green if count > 0
      subtitle: `${stats.trucks_count} truck(s)`,
    },
    {
      id: "trailers",
      label: "Trailers",
      status: company.trailers_status,
      isComplete: isOnboardingComplete || stats.trailers_count > 0, // Green if count > 0
      subtitle: `${stats.trailers_count} trailer(s)`,
    },
    {
      id: "drivers",
      label: "Drivers",
      status: company.drivers_status,
      isComplete: isOnboardingComplete || stats.drivers_count > 0, // Green if count > 0
      subtitle: `${stats.drivers_count} driver(s)`,
    },
    {
      id: "portal_access",
      label: "Portal Access",
      status: company.portal_access_enabled ? "Complete" : "Not Started",
      isComplete: company.status === "Active" && company.portal_access_enabled,
      subtitle: company.portal_activated_at
        ? new Date(company.portal_activated_at).toLocaleDateString()
        : "Not activated",
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
          {stages.map((stage) => (
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
                      : stage.status === "In Progress"
                      ? "bg-blue-500 border-blue-500"
                      : "bg-background border-border"
                  }`}
                >
                  {stage.isComplete ? (
                    (stage as any).icon === "mail" ? (
                      <Mail className="h-6 w-6 text-white" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    )
                  ) : stage.status === "In Progress" ? (
                    <Circle className="h-6 w-6 text-white fill-white" />
                  ) : (stage as any).icon === "mail" ? (
                    <Mail className="h-6 w-6 text-muted-foreground" />
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
                  {getStatusBadge(stage.status, stage.isComplete)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
