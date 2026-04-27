import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { carrierService, Driver, Truck } from "@/lib/carrierService";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface CarrierDriversTabProps {
  carrierId: string;
}

export const CarrierDriversTab = ({ carrierId }: CarrierDriversTabProps) => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    default_truck_id: "",
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    loadData();
  }, [carrierId]);

  const loadData = async () => {
    setIsLoading(true);
    const [driversData, trucksData] = await Promise.all([
      carrierService.getDriversByCarrier(carrierId),
      carrierService.getTrucksByCarrier(carrierId),
    ]);
    setDrivers(driversData);
    setTrucks(trucksData);
    setIsLoading(false);
  };

  const handleAdd = () => {
    setEditingDriver(null);
    setFormData({
      name: "",
      email: "",
      default_truck_id: trucks.length > 0 ? trucks[0].id : "",
      status: "active",
    });
    setShowDialog(true);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email,
      default_truck_id: driver.default_truck_id,
      status: driver.status,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.default_truck_id
    ) {
      toast({
        title: "Validation Error",
        description: "Name, email, and default truck are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let result;
      if (editingDriver) {
        result = await carrierService.updateDriver(editingDriver.id, formData);
      } else {
        result = await carrierService.createDriver(
          formData.name,
          carrierId,
          formData.email,
          formData.default_truck_id
        );
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Driver ${
            editingDriver ? "updated" : "added"
          } successfully`,
        });
        setShowDialog(false);
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save driver",
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

  const handleDelete = async (driver: Driver) => {
    if (!confirm(`Are you sure you want to delete driver ${driver.name}?`)) {
      return;
    }

    try {
      const result = await carrierService.deleteDriver(driver.id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Driver deleted successfully",
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete driver",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const getTruckName = (truckId: string) => {
    const truck = trucks.find((t) => t.id === truckId);
    return truck ? truck.truck_id : "Unknown";
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Driver Management</h3>
        <Button onClick={handleAdd} disabled={trucks.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>

      {trucks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Please add at least one truck before adding drivers.
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading drivers...
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No drivers found. Add your first driver to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Default Truck</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell className="font-medium">{driver.name}</TableCell>
                <TableCell>{driver.email}</TableCell>
                <TableCell>{getTruckName(driver.default_truck_id)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      driver.status === "active" ? "default" : "secondary"
                    }
                  >
                    {driver.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(driver)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(driver)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDriver ? "Edit Driver" : "Add New Driver"}
            </DialogTitle>
            <DialogDescription>
              {editingDriver
                ? "Update driver information"
                : "Add a new driver to your team"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="driver_name">Name *</Label>
              <Input
                id="driver_name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter driver name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver_email">Email *</Label>
              <Input
                id="driver_email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter driver email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_truck">Default Truck *</Label>
              <Select
                value={formData.default_truck_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, default_truck_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      {truck.truck_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingDriver && (
              <div className="space-y-2">
                <Label htmlFor="driver_status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
