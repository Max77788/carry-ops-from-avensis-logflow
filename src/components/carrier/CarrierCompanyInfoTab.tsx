import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { carrierService, Carrier } from "@/lib/carrierService";
import { Pencil, Save, X } from "lucide-react";

interface CarrierCompanyInfoTabProps {
  carrier: Carrier;
  onUpdate: () => void;
}

export const CarrierCompanyInfoTab = ({
  carrier,
  onUpdate,
}: CarrierCompanyInfoTabProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: carrier.name,
  });

  const handleCancel = () => {
    setFormData({
      name: carrier.name,
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await carrierService.updateCarrier(carrier.id, formData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Company information updated successfully",
        });
        setIsEditing(false);
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update company information",
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

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Company Information</h3>
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name</Label>
          {isEditing ? (
            <Input
              id="company_name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter company name"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {carrier.name || "Not set"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Company ID</Label>
          <p className="text-sm text-muted-foreground font-mono">
            {carrier.id}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Created At</Label>
          <p className="text-sm text-muted-foreground">
            {new Date(carrier.created_at).toLocaleString()}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Last Updated</Label>
          <p className="text-sm text-muted-foreground">
            {new Date(carrier.updated_at).toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
};

