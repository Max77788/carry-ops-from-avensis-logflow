import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Edit, X } from "lucide-react";
import { AddressInput } from "@/components/AddressInput";

interface CompanyInfoTabProps {
  companyData: any;
  setCompanyData: (data: any) => void;
}

const CompanyInfoTab = ({
  companyData,
  setCompanyData,
}: CompanyInfoTabProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState(companyData);

  const handleEdit = () => {
    setEditedData(companyData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedData(companyData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("companies")
        .update({
          name: editedData.name,
          business_address: editedData.business_address,
          city: editedData.city,
          state: editedData.state,
          zip: editedData.zip,
          legal_name_for_invoicing: editedData.legal_name_for_invoicing,
          mailing_address: editedData.mailing_address,
          mc_number: editedData.mc_number,
          dot_number: editedData.dot_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", companyData.id);

      if (error) throw error;

      setCompanyData(editedData);
      setIsEditing(false);

      toast({
        title: "Success",
        description: "Company information updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating company:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update company information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const data = isEditing ? editedData : companyData;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Company Information</h2>
        {!isEditing ? (
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={data?.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal_name">Legal Name for Invoicing *</Label>
            <Input
              id="legal_name"
              value={data?.legal_name_for_invoicing || ""}
              onChange={(e) =>
                updateField("legal_name_for_invoicing", e.target.value)
              }
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="business_address">Business Address *</Label>
            {isEditing ? (
              <AddressInput
                value={data?.business_address || ""}
                onChange={(value) => updateField("business_address", value)}
                placeholder="Enter business address"
              />
            ) : (
              <Input
                id="business_address"
                value={data?.business_address || ""}
                disabled
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={data?.city || ""}
              onChange={(e) => updateField("city", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={data?.state || ""}
              onChange={(e) => updateField("state", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code *</Label>
            <Input
              id="zip"
              value={data?.zip || ""}
              onChange={(e) => updateField("zip", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mc_number">MC Number *</Label>
            <Input
              id="mc_number"
              value={data?.mc_number || ""}
              onChange={(e) => updateField("mc_number", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dot_number">DOT Number *</Label>
            <Input
              id="dot_number"
              value={data?.dot_number || ""}
              onChange={(e) => updateField("dot_number", e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="mailing_address">Mailing Address (Optional)</Label>
            {isEditing ? (
              <AddressInput
                value={data?.mailing_address || ""}
                onChange={(value) => updateField("mailing_address", value)}
                placeholder="Enter mailing address"
              />
            ) : (
              <Input
                id="mailing_address"
                value={data?.mailing_address || ""}
                disabled
              />
            )}
          </div>
        </div>
      </Card>

      {companyData?.status && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Application Status
              </p>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {companyData.status}
              </span>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              {companyData.status === "Draft" && (
                <p>
                  Your application is in draft status. Complete onboarding to
                  proceed.
                </p>
              )}
              {companyData.status === "Onboarding Invited" && (
                <p>
                  You've been invited to complete onboarding. Please fill in all
                  required information.
                </p>
              )}
              {companyData.status === "Onboarding In Progress" && (
                <p>
                  Your onboarding is in progress. Complete all sections to
                  submit for review.
                </p>
              )}
              {companyData.status === "Pending Review" && (
                <p>
                  Your application is under review. We'll notify you once it's
                  approved.
                </p>
              )}
              {companyData.status === "Active" && (
                <p>✓ Your account is active and ready to use.</p>
              )}
              {companyData.status === "Inactive" && (
                <p>
                  Your account is currently inactive. Please contact support for
                  assistance.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CompanyInfoTab;
