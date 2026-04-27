import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminService,
  Company,
  CompanyType,
  CompanyStatus,
} from "@/lib/adminService";
import {
  Loader2,
  Save,
  Lock,
  KeyRound,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SetPasswordDialog } from "./SetPasswordDialog";
import { OnboardingRibbon } from "./OnboardingRibbon";
import { DeleteCompanyDialog } from "./DeleteCompanyDialog";

interface CompanyInfoTabProps {
  company: Company;
  onUpdate: () => void;
}

export const CompanyInfoTab = ({ company, onUpdate }: CompanyInfoTabProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: company.name,
    type: company.type,
    status: company.status,
    business_address: (company as any).business_address || "",
    city: company.city || "",
    state: company.state || "",
    zip: company.zip || "",
    legal_name_for_invoicing: (company as any).legal_name_for_invoicing || "",
    mailing_address: (company as any).mailing_address || "",
    mc_number: (company as any).mc_number || "",
    dot_number: (company as any).dot_number || "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const previousStatus = company.status;
      const newStatus = formData.status;

      // Update company information
      const result = await adminService.updateCompany(company.id, formData);

      if (result.success) {
        // Handle status-based triggers
        if (previousStatus !== newStatus) {
          await handleStatusChange(newStatus);
        }

        toast({
          title: "Success",
          description: "Company updated successfully",
        });
        setIsEditing(false);
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update company",
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
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: CompanyStatus) => {
    try {
      switch (newStatus) {
        case "Onboarding Invited":
          // Send onboarding email
          await sendOnboardingEmailForStatus();
          break;

        case "Suspended":
          // Disable portal access
          await adminService.enablePortalAccess(company.id, false);
          toast({
            title: "Portal Access Disabled",
            description:
              "Portal access has been disabled due to suspended status",
          });
          break;

        case "Active":
          // Enable portal access and send activation email
          await adminService.enablePortalAccess(company.id, true);
          await sendAccessEnabledEmail();
          break;
      }
    } catch (error) {
      console.error("Error handling status change:", error);
    }
  };

  const sendOnboardingEmailForStatus = async () => {
    try {
      // Get primary contact email
      const contacts = await adminService.getContactInfoByCompanyId(company.id);
      const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];

      if (!primaryContact?.Contact_Email) {
        toast({
          title: "Warning",
          description:
            "No contact email found. Please add a contact email to send onboarding invitation.",
          variant: "destructive",
        });
        return;
      }

      if (!company.password_hash || !company.plain_password) {
        toast({
          title: "Warning",
          description:
            "Please set a password for this company first before sending onboarding email.",
          variant: "destructive",
        });
        return;
      }

      // Send onboarding email with actual password
      const result = await adminService.sendOnboardingEmail({
        company_id: company.id,
        company_name: company.name,
        sent_to: primaryContact.Contact_Email,
        sent_by: "Admin",
        username: company.name,
        temp_password: company.plain_password,
      });

      if (result.success) {
        toast({
          title: "Onboarding Email Sent",
          description: `Onboarding email sent to ${primaryContact.Contact_Email}`,
        });
      } else {
        toast({
          title: "Email Failed",
          description: result.error || "Failed to send onboarding email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending onboarding email:", error);
      toast({
        title: "Error",
        description: "Failed to send onboarding email",
        variant: "destructive",
      });
    }
  };

  const sendAccessEnabledEmail = async () => {
    try {
      // Get primary contact email
      const contacts = await adminService.getContactInfoByCompanyId(company.id);
      const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];

      if (!primaryContact?.Contact_Email) {
        toast({
          title: "Warning",
          description:
            "No contact email found. Please add a contact email to send activation notification.",
          variant: "destructive",
        });
        return;
      }

      // Check if password is available
      if (!company.plain_password) {
        toast({
          title: "Warning",
          description:
            "No password found for this company. Please set a password first.",
          variant: "destructive",
        });
        return;
      }

      // Send access enabled email with credentials
      const result = await adminService.sendAccessEnabledEmail({
        company_id: company.id,
        company_name: company.name,
        sent_to: primaryContact.Contact_Email,
        username: company.name,
        password: company.plain_password,
      });

      if (result.success) {
        toast({
          title: "Portal Access Enabled",
          description: `Access enabled email sent to ${primaryContact.Contact_Email}`,
        });
      } else {
        toast({
          title: "Email Failed",
          description: result.error || "Failed to send access enabled email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending access enabled email:", error);
      toast({
        title: "Error",
        description: "Failed to send access enabled email",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      name: company.name,
      type: company.type,
      status: company.status,
      business_address: (company as any).business_address || "",
      city: company.city || "",
      state: company.state || "",
      zip: company.zip || "",
      legal_name_for_invoicing: (company as any).legal_name_for_invoicing || "",
      mailing_address: (company as any).mailing_address || "",
      mc_number: (company as any).mc_number || "",
      dot_number: (company as any).dot_number || "",
    });
    setIsEditing(false);
  };

  const handleDeleteSuccess = () => {
    // Navigate back to admin dashboard after successful deletion
    navigate("/admin/dashboard");
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Progress Ribbon */}
      <OnboardingRibbon company={company} />

      {/* Portal Access Status - Read Only */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-center gap-3">
          {company.portal_access_enabled ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h4 className="font-semibold">Portal Access</h4>
            <p className="text-sm text-muted-foreground">
              {company.portal_access_enabled
                ? `Enabled on ${
                    company.portal_activated_at
                      ? new Date(
                          company.portal_activated_at
                        ).toLocaleDateString()
                      : "N/A"
                  }`
                : "Portal access is currently disabled"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Portal access is controlled by the company status. Set status to
              "Active" to enable access or "Suspended" to disable.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Company Information</h3>
        <div className="flex gap-2">
          {/* Password Management Button */}
          <Button
            variant="outline"
            onClick={() => setShowPasswordDialog(true)}
            className="gap-2"
          >
            {company.password_hash ? (
              <>
                <KeyRound className="h-4 w-4" />
                Change Password
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Set Password
              </>
            )}
          </Button>

          {/* Edit/Save Buttons */}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {/* Company Name */}
        <div className="grid gap-2">
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={!isEditing}
          />
        </div>

        {/* Company Type */}
        <div className="grid gap-2">
          <Label htmlFor="company_type">Company Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData({ ...formData, type: value as CompanyType })
            }
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Carrier">Carrier</SelectItem>
              <SelectItem value="Scale House">Scale House</SelectItem>
              <SelectItem value="Destination Client">Destination Client</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value as CompanyStatus })
            }
            disabled={!isEditing}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Onboarding Invited">
                Onboarding Invited
              </SelectItem>
              <SelectItem value="Onboarding In Progress">
                Onboarding In Progress
              </SelectItem>
              <SelectItem value="Onboarding Submitted">
                Onboarding Submitted
              </SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Password (Read-only with visibility toggle) */}
        <div className="grid gap-2">
          <Label htmlFor="password">Password Hash</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={company.password_hash || "Not set"}
              disabled
              className="pr-10"
            />
            {company.password_hash && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Use the "Change Password" button above to update the password
          </p>
        </div>

        {/* Address
        <div className="grid gap-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>
        */}

        {/* Business Address */}
        <div className="grid gap-2">
          <Label htmlFor="business_address">Business Address *</Label>
          <Input
            id="business_address"
            value={formData.business_address}
            onChange={(e) =>
              setFormData({ ...formData, business_address: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>

        {/* City, State, Zip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) =>
                setFormData({ ...formData, state: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zip">Zip *</Label>
            <Input
              id="zip"
              value={formData.zip}
              onChange={(e) =>
                setFormData({ ...formData, zip: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* Legal Name for Invoicing */}
        <div className="grid gap-2">
          <Label htmlFor="legal_name_for_invoicing">
            Legal Name for Invoicing *
          </Label>
          <Input
            id="legal_name_for_invoicing"
            value={formData.legal_name_for_invoicing}
            onChange={(e) =>
              setFormData({
                ...formData,
                legal_name_for_invoicing: e.target.value,
              })
            }
            disabled={!isEditing}
          />
        </div>

        {/* Mailing Address */}
        <div className="grid gap-2">
          <Label htmlFor="mailing_address">
            Mailing Address (if different)
          </Label>
          <Input
            id="mailing_address"
            value={formData.mailing_address}
            onChange={(e) =>
              setFormData({ ...formData, mailing_address: e.target.value })
            }
            disabled={!isEditing}
          />
        </div>

        {/* MC Number and DOT Number */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="mc_number">MC Number *</Label>
            <Input
              id="mc_number"
              value={formData.mc_number}
              onChange={(e) =>
                setFormData({ ...formData, mc_number: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dot_number">DOT Number *</Label>
            <Input
              id="dot_number"
              value={formData.dot_number}
              onChange={(e) =>
                setFormData({ ...formData, dot_number: e.target.value })
              }
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* File URLs (Read-only) */}
        {((company as any).coi_file_url || (company as any).w9_file_url) && (
          <div className="grid gap-2">
            <Label>Uploaded Documents</Label>
            <div className="space-y-2">
              {(company as any).coi_file_url && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">COI:</span>
                  <a
                    href={(company as any).coi_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Certificate of Insurance
                  </a>
                </div>
              )}
              {(company as any).w9_file_url && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">W9:</span>
                  <a
                    href={(company as any).w9_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View W9 Form
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone - Delete Company */}
      <div className="mt-8 pt-8 border-t border-border">
        <div className="rounded-lg border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300 mt-2">
                Once you delete a company, there is no going back. This will
                permanently delete all company data, including contacts, trucks,
                trailers, drivers, and all associated records.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="ml-4 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Company
            </Button>
          </div>
        </div>
      </div>

      {/* Password Management Dialog */}
      <SetPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        company={company}
        onSuccess={onUpdate}
      />

      {/* Delete Company Dialog */}
      <DeleteCompanyDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        company={company}
        onDelete={handleDeleteSuccess}
      />
    </div>
  );
};
