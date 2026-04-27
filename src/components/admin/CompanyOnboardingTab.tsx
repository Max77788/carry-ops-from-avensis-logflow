import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, CheckCircle2, Circle, Loader2, Send } from "lucide-react";
import { adminService, Company, OnboardingEmail } from "@/lib/adminService";
import { toast } from "@/hooks/use-toast";

interface CompanyOnboardingTabProps {
  company: Company;
  onUpdate: () => void;
}

export const CompanyOnboardingTab = ({
  company,
  onUpdate,
}: CompanyOnboardingTabProps) => {
  const [emails, setEmails] = useState<OnboardingEmail[]>([]);
  const [stats, setStats] = useState({
    trucks_count: 0,
    drivers_count: 0,
    trailers_count: 0,
    contacts_count: 0,
    destination_sites_count: 0,
    pickup_sites_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  useEffect(() => {
    loadData();
  }, [company.id]);

  const loadData = async () => {
    setIsLoading(true);
    const [emailsData, statsData, contacts] = await Promise.all([
      adminService.getOnboardingEmails(company.id),
      adminService.getCompanyStats(company.id),
      adminService.getContactInfoByCompanyId(company.id),
    ]);
    setEmails(emailsData);
    setStats(statsData);

    // Pre-fill email with primary contact or first contact
    if (contacts && contacts.length > 0) {
      const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];
      if (primaryContact.Contact_Email) {
        setEmailTo(primaryContact.Contact_Email);
      }
    }

    setIsLoading(false);
  };

  const handleSendEmail = async () => {
    if (!emailTo) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (!company.password_hash || !company.plain_password) {
      toast({
        title: "Error",
        description:
          "Please set a password for this company first before sending onboarding email.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await adminService.sendOnboardingEmail({
        company_id: company.id,
        company_name: company.name,
        sent_to: emailTo,
        sent_by: "Admin",
        username: company.name,
        temp_password: company.plain_password,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Onboarding email sent successfully",
        });
        setShowEmailDialog(false);
        setEmailTo("");
        loadData();
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

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

  // Check if onboarding is submitted or active - if so, show all as complete
  const isOnboardingSubmitted = company.status === "Onboarding Submitted";
  const isActive = company.status === "Active";
  const isOnboardingComplete = isOnboardingSubmitted || isActive;

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
      isComplete:
        isOnboardingComplete || company.contacts_status === "Complete",
      subtitle: `${stats.contacts_count} contact(s)`,
    },
    {
      id: "fleet",
      label: "Fleet",
      status: company.fleet_status,
      isComplete: isOnboardingComplete || company.fleet_status === "Complete",
      subtitle: `${stats.trucks_count} truck(s)`,
    },
    {
      id: "trailers",
      label: "Trailers",
      status: company.trailers_status,
      isComplete:
        isOnboardingComplete || company.trailers_status === "Complete",
      subtitle: `${stats.trailers_count} trailer(s)`,
    },
    {
      id: "drivers",
      label: "Drivers",
      status: company.drivers_status,
      isComplete: isOnboardingComplete || company.drivers_status === "Complete",
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
    <div className="space-y-6">
      {/* Onboarding Progress Ribbon */}
      <Card className="p-8">
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
            {stages.map((stage, index) => (
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

      {/* Send Onboarding Email */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Onboarding Email</h3>
            <p className="text-sm text-muted-foreground">
              Send onboarding email with portal credentials
            </p>
          </div>
          <Button onClick={() => setShowEmailDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>

        {/* Email History */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent To</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No emails sent yet
                  </TableCell>
                </TableRow>
              ) : (
                emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>{email.sent_to}</TableCell>
                    <TableCell>{email.sent_by}</TableCell>
                    <TableCell>
                      {new Date(email.sent_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500">
                        {email.email_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Send Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Onboarding Email</DialogTitle>
            <DialogDescription>
              Send onboarding email to {company.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email_to">Send To *</Label>
              <Input
                id="email_to"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder={company.contact_email || "email@example.com"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending || !emailTo}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
