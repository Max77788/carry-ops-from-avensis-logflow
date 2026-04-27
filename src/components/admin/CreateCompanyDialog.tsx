import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminService, CompanyType, CompanyStatus } from "@/lib/adminService";
import { Loader2, RefreshCw, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Generate a random password
const generatePassword = () => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Check password strength
const getPasswordStrength = (password: string) => {
  if (password.length < 8)
    return { strength: "weak", label: "Too Short", color: "text-red-500" };

  let score = 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score >= 4)
    return { strength: "strong", label: "Strong", color: "text-green-500" };
  if (score >= 3)
    return { strength: "medium", label: "Medium", color: "text-yellow-500" };
  return { strength: "weak", label: "Weak", color: "text-orange-500" };
};

export const CreateCompanyDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateCompanyDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company_type: "" as CompanyType | "",
    status: "Draft" as CompanyStatus,
    address: "",
    city: "",
    state: "",
    zip: "",
    primary_email: "",
    password: generatePassword(),
  });

  const sendOnboardingEmail = async (
    companyId: string,
    email: string,
    companyName: string,
    password: string
  ) => {
    try {
      const result = await adminService.sendOnboardingEmail({
        company_id: companyId,
        company_name: companyName,
        sent_to: email,
        sent_by: "Admin",
        username: companyName,
        temp_password: password,
      });

      return result.success;
    } catch (error) {
      console.error("Error sending onboarding email:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name || formData.name.trim() === "") {
        toast({
          title: "Validation Error",
          description: "Company name is required",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.address || formData.address.trim() === "") {
        toast({
          title: "Validation Error",
          description: "Business address is required when creating a company",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.city || formData.city.trim() === "") {
        toast({
          title: "Validation Error",
          description: "City is required when creating a company",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.state || formData.state.trim() === "") {
        toast({
          title: "Validation Error",
          description: "State is required when creating a company",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.zip || formData.zip.trim() === "") {
        toast({
          title: "Validation Error",
          description: "Zip code is required when creating a company",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Hash the password using SHA256 (same as authentication)
      const CryptoJS = await import("crypto-js");
      const hashedPassword = CryptoJS.SHA256(formData.password).toString();

      const result = await adminService.createCompany({
        name: formData.name,
        business_address: formData.address, // Map address to business_address
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        type: formData.company_type || undefined,
        status: formData.status,
        password_hash: hashedPassword,
        plain_password: formData.password, // Store plain password for admin reference
        contact_email: formData.primary_email,
      });

      if (result.success && result.data) {
        // Send onboarding email ONLY if company type is "Carrier" and status is "Onboarding Invited"
        if (
          formData.company_type === "Carrier" &&
          formData.status === "Onboarding Invited" &&
          formData.primary_email
        ) {
          const emailSent = await sendOnboardingEmail(
            result.data.id,
            formData.primary_email,
            formData.name,
            formData.password
          );

          if (emailSent) {
            toast({
              title: "Success",
              description: `Company created and onboarding email sent to ${formData.primary_email}`,
            });
          } else {
            toast({
              title: "Warning",
              description: `Company created but failed to send onboarding email to ${formData.primary_email}`,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Success",
            description: "Company created successfully",
          });
        }

        onSuccess();
        // Reset form
        setFormData({
          name: "",
          company_type: "" as CompanyType | "",
          status: "Draft",
          address: "",
          city: "",
          state: "",
          zip: "",
          primary_email: "",
          password: generatePassword(),
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create company",
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
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Company</DialogTitle>
          <DialogDescription>
            Add a new company to the system. You can add more details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Company Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* Company Type */}
            <div className="grid gap-2">
              <Label htmlFor="company_type">Company Type *</Label>
              <Select
                value={formData.company_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    company_type: value as CompanyType,
                    // Reset status to Draft when type changes
                    status: "Draft",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carrier">Carrier</SelectItem>
                  <SelectItem value="Scale House">Scale House</SelectItem>
                  <SelectItem value="Destination Client">Destination Client</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status - Only show after Company Type is selected */}
            {formData.company_type && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as CompanyStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    {formData.company_type === "Carrier" && (
                      <>
                        <SelectItem value="Onboarding Invited">
                          Onboarding Invited
                        </SelectItem>
                        <SelectItem value="Onboarding In Progress">
                          Onboarding In Progress
                        </SelectItem>
                      </>
                    )}
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Primary Email */}
            <div className="grid gap-2">
              <Label htmlFor="primary_email">Primary Email *</Label>
              <Input
                id="primary_email"
                type="email"
                value={formData.primary_email}
                onChange={(e) =>
                  setFormData({ ...formData, primary_email: e.target.value })
                }
                placeholder="contact@company.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                This email will receive the onboarding invitation if status is
                set to "Onboarding Invited"
              </p>
            </div>

            {/* Auto-generated Password */}
            <div className="grid gap-2">
              <Label htmlFor="password">Auto-Generated Password</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setFormData({ ...formData, password: generatePassword() })
                  }
                  title="Regenerate Password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getPasswordStrength(formData.password).strength ===
                      "strong" && <Check className="h-4 w-4 text-green-500" />}
                    {getPasswordStrength(formData.password).strength ===
                      "medium" && <Check className="h-4 w-4 text-yellow-500" />}
                    {getPasswordStrength(formData.password).strength ===
                      "weak" && <X className="h-4 w-4 text-red-500" />}
                    <span
                      className={`text-xs font-medium ${
                        getPasswordStrength(formData.password).color
                      }`}
                    >
                      {getPasswordStrength(formData.password).label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Will be sent via email
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label htmlFor="address">Business Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
                placeholder="Street address of the business"
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
                  required
                  placeholder="City"
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
                  required
                  placeholder="State"
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
                  required
                  placeholder="Zip code"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
