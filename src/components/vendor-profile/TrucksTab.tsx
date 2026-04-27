import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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

interface TrucksTabProps {
  trucks: any[];
  setTrucks: (trucks: any[]) => void;
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

const TRUCK_TYPES = [
  "Dump Truck",
  "Semi-Trailer",
  "Flatbed",
  "Box Truck",
  "Tanker",
  "Refrigerated",
  "Other",
];

const TrucksTab = ({ trucks, setTrucks, carrierId }: TrucksTabProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTruck, setEditedTruck] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTruck, setNewTruck] = useState({
    truck_id: "",
    license_plate: "",
    license_state: "",
    truck_type: "",
    capacity: "",
    vin: "",
    is_on_insurance_policy: true,
    gps_device_id: "",
  });

  const handleEdit = (truck: any) => {
    setEditingId(truck.id);
    setEditedTruck({ ...truck });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedTruck(null);
  };

  const handleSaveEdit = async (truckId: string) => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("trucks")
        .update({
          truck_id: editedTruck.truck_id,
          license_plate: editedTruck.license_plate,
          license_state: editedTruck.license_state,
          truck_type: editedTruck.truck_type,
          capacity: editedTruck.capacity,
          vin: editedTruck.vin,
          is_on_insurance_policy: editedTruck.is_on_insurance_policy,
          gps_device_id: editedTruck.gps_device_id,
        })
        .eq("id", truckId);

      if (error) throw error;

      setTrucks(trucks.map((t) => (t.id === truckId ? editedTruck : t)));
      setEditingId(null);
      setEditedTruck(null);

      toast({
        title: "Success",
        description: "Truck updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating truck:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update truck",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (truckId: string) => {
    if (!confirm("Are you sure you want to delete this truck?")) return;

    try {
      const { error } = await supabase
        .from("trucks")
        .delete()
        .eq("id", truckId);

      if (error) throw error;

      setTrucks(trucks.filter((t) => t.id !== truckId));

      toast({
        title: "Success",
        description: "Truck deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting truck:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete truck",
        variant: "destructive",
      });
    }
  };

  const handleAddTruck = async () => {
    if (!newTruck.truck_id || !newTruck.license_plate || !newTruck.vin) {
      toast({
        title: "Validation Error",
        description: "Please fill in Truck ID, License Plate, and VIN",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const { data, error } = await supabase
        .from("trucks")
        .insert({
          carrier_id: carrierId,
          ...newTruck,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      setTrucks([...trucks, data]);
      setIsAdding(false);
      setNewTruck({
        truck_id: "",
        license_plate: "",
        license_state: "",
        truck_type: "",
        capacity: "",
        vin: "",
        is_on_insurance_policy: true,
        gps_device_id: "",
      });

      toast({
        title: "Success",
        description: "Truck added successfully",
      });
    } catch (error: any) {
      console.error("Error adding truck:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add truck",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditedField = (field: string, value: any) => {
    setEditedTruck({ ...editedTruck, [field]: value });
  };

  const updateNewField = (field: string, value: any) => {
    setNewTruck({ ...newTruck, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Trucks</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="mr-2 h-4 w-4" />
          Add Truck
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 border-2 border-primary">
          <h3 className="text-lg font-semibold mb-4">New Truck</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Truck ID *</Label>
              <Input
                value={newTruck.truck_id}
                onChange={(e) => updateNewField("truck_id", e.target.value)}
                placeholder="Truck ID"
              />
            </div>
            <div className="space-y-2">
              <Label>License Plate *</Label>
              <Input
                value={newTruck.license_plate}
                onChange={(e) =>
                  updateNewField("license_plate", e.target.value)
                }
                placeholder="License plate"
              />
            </div>
            <div className="space-y-2">
              <Label>License State</Label>
              <Select
                value={newTruck.license_state}
                onValueChange={(value) =>
                  updateNewField("license_state", value)
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
              <Label>Truck Type</Label>
              <Select
                value={newTruck.truck_type}
                onValueChange={(value) => updateNewField("truck_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TRUCK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>VIN *</Label>
              <Input
                value={newTruck.vin}
                onChange={(e) => updateNewField("vin", e.target.value)}
                placeholder="Vehicle Identification Number"
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity (tons)</Label>
              <Input
                value={newTruck.capacity}
                onChange={(e) => updateNewField("capacity", e.target.value)}
                placeholder="Capacity"
              />
            </div>
            <div className="space-y-2">
              <Label>GPS Device ID</Label>
              <Input
                value={newTruck.gps_device_id}
                onChange={(e) =>
                  updateNewField("gps_device_id", e.target.value)
                }
                placeholder="GPS device ID"
              />
            </div>
            <div className="space-y-2">
              <Label>On Insurance Policy?</Label>
              <Select
                value={newTruck.is_on_insurance_policy ? "Yes" : "No"}
                onValueChange={(value) =>
                  updateNewField("is_on_insurance_policy", value === "Yes")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleAddTruck} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Add Truck
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {trucks.length === 0 && !isAdding && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No trucks added yet</p>
        </Card>
      )}

      {trucks.map((truck) => (
        <Card key={truck.id} className="p-6">
          {editingId === truck.id ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Truck</h3>
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
                    onClick={() => handleSaveEdit(truck.id)}
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
                  <Label>Truck ID *</Label>
                  <Input
                    value={editedTruck.truck_id || ""}
                    onChange={(e) =>
                      updateEditedField("truck_id", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>License Plate *</Label>
                  <Input
                    value={editedTruck.license_plate || ""}
                    onChange={(e) =>
                      updateEditedField("license_plate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>License State</Label>
                  <Select
                    value={editedTruck.license_state || ""}
                    onValueChange={(value) =>
                      updateEditedField("license_state", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label>Truck Type</Label>
                  <Select
                    value={editedTruck.truck_type || ""}
                    onValueChange={(value) =>
                      updateEditedField("truck_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRUCK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>VIN *</Label>
                  <Input
                    value={editedTruck.vin || ""}
                    onChange={(e) => updateEditedField("vin", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacity (tons)</Label>
                  <Input
                    value={editedTruck.capacity || ""}
                    onChange={(e) =>
                      updateEditedField("capacity", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>GPS Device ID</Label>
                  <Input
                    value={editedTruck.gps_device_id || ""}
                    onChange={(e) =>
                      updateEditedField("gps_device_id", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>On Insurance Policy?</Label>
                  <Select
                    value={editedTruck.is_on_insurance_policy ? "Yes" : "No"}
                    onValueChange={(value) =>
                      updateEditedField(
                        "is_on_insurance_policy",
                        value === "Yes"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{truck.truck_id}</h3>
                  <p className="text-sm text-muted-foreground">
                    {truck.license_plate}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(truck)}
                    size="sm"
                    variant="outline"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(truck.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p>{truck.truck_type || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">VIN</p>
                  <p>{truck.vin || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Capacity</p>
                  <p>{truck.capacity ? `${truck.capacity} tons` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">License State</p>
                  <p>{truck.license_state || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">On Insurance</p>
                  <p>{truck.is_on_insurance_policy ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="capitalize">{truck.status || "N/A"}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default TrucksTab;
