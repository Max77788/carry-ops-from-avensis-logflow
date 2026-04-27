import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Edit, X } from "lucide-react";

interface DriversTabProps {
  drivers: any[];
  setDrivers: (drivers: any[]) => void;
  carrierId: string;
}

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const DriversTab = ({ drivers, setDrivers, carrierId }: DriversTabProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedDriver, setEditedDriver] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: "",
    phone: "",
    email: "",
    cdl_number: "",
    cdl_state: "",
    driver_type: "",
    operating_hours: "",
    weekend_availability: "",
    emergency_contact: "",
    comments: "",
  });

  const handleEdit = (driver: any) => {
    setEditingId(driver.id);
    setEditedDriver({ ...driver });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedDriver(null);
  };

  const handleSaveEdit = async (driverId: string) => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("drivers")
        .update({
          name: editedDriver.name,
          phone: editedDriver.phone,
          email: editedDriver.email,
          cdl_number: editedDriver.cdl_number,
          cdl_state: editedDriver.cdl_state,
          driver_type: editedDriver.driver_type,
          operating_hours: editedDriver.operating_hours,
          weekend_availability: editedDriver.weekend_availability,
          emergency_contact: editedDriver.emergency_contact,
          comments: editedDriver.comments,
        })
        .eq("id", driverId);

      if (error) throw error;

      setDrivers(drivers.map((d) => (d.id === driverId ? editedDriver : d)));
      setEditingId(null);
      setEditedDriver(null);

      toast({
        title: "Success",
        description: "Driver updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating driver:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update driver",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (driverId: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driverId);

      if (error) throw error;

      setDrivers(drivers.filter((d) => d.id !== driverId));

      toast({
        title: "Success",
        description: "Driver deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting driver:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete driver",
        variant: "destructive",
      });
    }
  };

  const handleAddDriver = async () => {
    if (!newDriver.name || !newDriver.phone || !newDriver.cdl_number) {
      toast({
        title: "Validation Error",
        description: "Please fill in Name, Phone, and CDL Number",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const { data, error } = await supabase
        .from("drivers")
        .insert({
          carrier_id: carrierId,
          ...newDriver,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      setDrivers([...drivers, data]);
      setIsAdding(false);
      setNewDriver({
        name: "",
        phone: "",
        email: "",
        cdl_number: "",
        cdl_state: "",
        driver_type: "",
        operating_hours: "",
        weekend_availability: "",
        emergency_contact: "",
        comments: "",
      });

      toast({
        title: "Success",
        description: "Driver added successfully",
      });
    } catch (error: any) {
      console.error("Error adding driver:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add driver",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditedField = (field: string, value: string) => {
    setEditedDriver({ ...editedDriver, [field]: value });
  };

  const updateNewField = (field: string, value: string) => {
    setNewDriver({ ...newDriver, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Drivers</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 border-2 border-primary">
          <h3 className="text-lg font-semibold mb-4">New Driver</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Driver Name *</Label>
              <Input
                value={newDriver.name}
                onChange={(e) => updateNewField("name", e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={newDriver.phone}
                onChange={(e) => updateNewField("phone", e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newDriver.email}
                onChange={(e) => updateNewField("email", e.target.value)}
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <Label>CDL Number *</Label>
              <Input
                value={newDriver.cdl_number}
                onChange={(e) => updateNewField("cdl_number", e.target.value)}
                placeholder="CDL number"
              />
            </div>
            <div className="space-y-2">
              <Label>CDL State</Label>
              <Select
                value={newDriver.cdl_state}
                onValueChange={(value) => updateNewField("cdl_state", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Driver Type</Label>
              <Select
                value={newDriver.driver_type}
                onValueChange={(value) => updateNewField("driver_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Company Driver">Company Driver</SelectItem>
                  <SelectItem value="Owner Operator">Owner Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operating Hours</Label>
              <Input
                value={newDriver.operating_hours}
                onChange={(e) =>
                  updateNewField("operating_hours", e.target.value)
                }
                placeholder="e.g., 8am-5pm"
              />
            </div>
            <div className="space-y-2">
              <Label>Weekend Availability</Label>
              <Select
                value={newDriver.weekend_availability}
                onValueChange={(value) =>
                  updateNewField("weekend_availability", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Sometimes">Sometimes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Emergency Contact</Label>
              <Input
                value={newDriver.emergency_contact}
                onChange={(e) =>
                  updateNewField("emergency_contact", e.target.value)
                }
                placeholder="Emergency contact info"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Comments</Label>
              <Textarea
                value={newDriver.comments}
                onChange={(e) => updateNewField("comments", e.target.value)}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => setIsAdding(false)}
              variant="outline"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleAddDriver} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Add Driver
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {drivers.length === 0 && !isAdding && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No drivers added yet</p>
        </Card>
      )}

      {drivers.map((driver) => (
        <Card key={driver.id} className="p-6">
          {editingId === driver.id ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Driver</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSaveEdit(driver.id)}
                    size="sm"
                    disabled={isSaving}
                  >
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Driver Name *</Label>
                  <Input
                    value={editedDriver?.name || ""}
                    onChange={(e) => updateEditedField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={editedDriver?.phone || ""}
                    onChange={(e) => updateEditedField("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editedDriver?.email || ""}
                    onChange={(e) => updateEditedField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CDL Number *</Label>
                  <Input
                    value={editedDriver?.cdl_number || ""}
                    onChange={(e) =>
                      updateEditedField("cdl_number", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CDL State</Label>
                  <Select
                    value={editedDriver?.cdl_state || ""}
                    onValueChange={(value) =>
                      updateEditedField("cdl_state", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Driver Type</Label>
                  <Select
                    value={editedDriver?.driver_type || ""}
                    onValueChange={(value) =>
                      updateEditedField("driver_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Company Driver">
                        Company Driver
                      </SelectItem>
                      <SelectItem value="Owner Operator">
                        Owner Operator
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Operating Hours</Label>
                  <Input
                    value={editedDriver?.operating_hours || ""}
                    onChange={(e) =>
                      updateEditedField("operating_hours", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weekend Availability</Label>
                  <Select
                    value={editedDriver?.weekend_availability || ""}
                    onValueChange={(value) =>
                      updateEditedField("weekend_availability", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Sometimes">Sometimes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Emergency Contact</Label>
                  <Input
                    value={editedDriver?.emergency_contact || ""}
                    onChange={(e) =>
                      updateEditedField("emergency_contact", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Comments</Label>
                  <Textarea
                    value={editedDriver?.comments || ""}
                    onChange={(e) =>
                      updateEditedField("comments", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{driver.name}</h3>
                  {driver.driver_type && (
                    <p className="text-sm text-muted-foreground">
                      {driver.driver_type}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(driver)}
                    size="sm"
                    variant="outline"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(driver.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{driver.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{driver.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CDL Number</p>
                  <p>{driver.cdl_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CDL State</p>
                  <p>{driver.cdl_state || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Operating Hours</p>
                  <p>{driver.operating_hours || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Weekend Availability</p>
                  <p>{driver.weekend_availability || "N/A"}</p>
                </div>
                {driver.emergency_contact && (
                  <div className="md:col-span-3">
                    <p className="text-muted-foreground">Emergency Contact</p>
                    <p>{driver.emergency_contact}</p>
                  </div>
                )}
                {driver.comments && (
                  <div className="md:col-span-3">
                    <p className="text-muted-foreground">Comments</p>
                    <p>{driver.comments}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default DriversTab;
