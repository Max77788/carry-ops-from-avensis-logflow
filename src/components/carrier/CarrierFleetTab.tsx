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
import { carrierService, Truck } from "@/lib/carrierService";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface CarrierFleetTabProps {
  carrierId: string;
}

export const CarrierFleetTab = ({ carrierId }: CarrierFleetTabProps) => {
  const { toast } = useToast();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    truck_id: "",
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    loadTrucks();
  }, [carrierId]);

  const loadTrucks = async () => {
    setIsLoading(true);
    const data = await carrierService.getTrucksByCarrier(carrierId);
    setTrucks(data);
    setIsLoading(false);
  };

  const handleAdd = () => {
    setEditingTruck(null);
    setFormData({
      truck_id: "",
      status: "active",
    });
    setShowDialog(true);
  };

  const handleEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setFormData({
      truck_id: truck.truck_id,
      status: truck.status || "active",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.truck_id.trim()) {
      toast({
        title: "Validation Error",
        description: "Truck ID is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let result;
      if (editingTruck) {
        result = await carrierService.updateTruck(editingTruck.id, formData);
      } else {
        result = await carrierService.createTruck(
          formData.truck_id,
          carrierId,
          formData.status
        );
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Truck ${
            editingTruck ? "updated" : "added"
          } successfully`,
        });
        setShowDialog(false);
        loadTrucks();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save truck",
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

  const handleDelete = async (truck: Truck) => {
    if (!confirm(`Are you sure you want to delete truck ${truck.truck_id}?`)) {
      return;
    }

    try {
      const result = await carrierService.deleteTruck(truck.id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Truck deleted successfully",
        });
        loadTrucks();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete truck",
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

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Fleet Management</h3>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Truck
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading trucks...
        </div>
      ) : trucks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No trucks found. Add your first truck to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Truck ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trucks.map((truck) => (
              <TableRow key={truck.id}>
                <TableCell className="font-medium">{truck.truck_id}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      truck.status === "active" ? "default" : "secondary"
                    }
                  >
                    {truck.status || "active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(truck.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(truck)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(truck)}
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
              {editingTruck ? "Edit Truck" : "Add New Truck"}
            </DialogTitle>
            <DialogDescription>
              {editingTruck
                ? "Update truck information"
                : "Add a new truck to your fleet"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="truck_id">Truck ID *</Label>
              <Input
                id="truck_id"
                value={formData.truck_id}
                onChange={(e) =>
                  setFormData({ ...formData, truck_id: e.target.value })
                }
                placeholder="Enter truck ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
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
