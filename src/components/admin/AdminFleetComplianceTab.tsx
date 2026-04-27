import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, XCircle, Eye, Edit2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TruckWithCompliance {
  id: string;
  truck_id: string;
  carrier_id: string;
  status: string;
  compliance_status: string;
  admin_notes: string | null;
  last_inspection_date: string | null;
  last_inspection_status: string | null;
  license_plate: string | null;
  license_state: string | null;
  truck_type: string | null;
  vin: string | null;
  created_at: string;
  carrier_name?: string;
  issues_count?: number;
}

interface InspectionIssue {
  item_name: string;
  notes: string;
  status: string;
  checked_at: string;
}

export const AdminFleetComplianceTab = () => {
  const [trucks, setTrucks] = useState<TruckWithCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState<TruckWithCompliance | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [complianceFilter, setComplianceFilter] = useState<string>("restricted");
  const [issuesFilter, setIssuesFilter] = useState<string>("all");
  
  const [editForm, setEditForm] = useState({
    compliance_status: "",
    admin_notes: "",
  });

  const [inspectionIssues, setInspectionIssues] = useState<InspectionIssue[]>([]);

  useEffect(() => {
    loadFleetData();
  }, []);

  const loadFleetData = async () => {
    setIsLoading(true);
    try {
      // Get all trucks with carrier info and latest inspection metadata in parallel
      // Use stored fields to minimize queries
      const { data: trucksData, error: trucksError } = await supabase
        .from("trucks")
        .select(`
          id,
          truck_id,
          carrier_id,
          status,
          compliance_status,
          admin_notes,
          last_inspection_date,
          last_inspection_status,
          license_plate,
          license_state,
          truck_type,
          vin,
          created_at,
          carrier:companies!trucks_carrier_id_fkey_companies(name)
        `)
        .order("created_at", { ascending: false });

      if (trucksError) throw trucksError;

      if (!trucksData || trucksData.length === 0) {
        setTrucks([]);
        return;
      }

      // Only fetch issue counts for trucks that need them (have issues_reported status or restricted compliance)
      const trucksNeedingDetails = trucksData.filter(
        (t) => t.last_inspection_status === "issues_reported" || t.compliance_status === "restricted"
      );

      let truckIssuesMap = new Map<string, number>();

      if (trucksNeedingDetails.length > 0 && trucksNeedingDetails.length <= 100) {
        // For reasonable number of trucks, fetch in parallel batches
        const truckIdsWithIssues = trucksNeedingDetails.map((t) => t.id);
        
        // Fetch latest inspection for each truck with issues (optimized: only ids)
        const { data: latestInspections, error: inspectionsError } = await supabase
          .from("truck_daily_inspections")
          .select("id, truck_id")
          .in("truck_id", truckIdsWithIssues)
          .order("inspection_date", { ascending: false })
          .limit(truckIdsWithIssues.length * 5); // Reasonable limit per truck

        if (inspectionsError) throw inspectionsError;

        // Group by truck_id and get latest (first occurrence per truck_id since sorted desc)
        const truckToInspectionMap = new Map<string, string>();
        const seenTrucks = new Set<string>();
        (latestInspections || []).forEach((inspection) => {
          if (!seenTrucks.has(inspection.truck_id)) {
            truckToInspectionMap.set(inspection.truck_id, inspection.id);
            seenTrucks.add(inspection.truck_id);
          }
        });

        const inspectionIds = Array.from(truckToInspectionMap.values());

        if (inspectionIds.length > 0) {
          // Single optimized query: Get all "not_working" items for relevant inspections
          // Only fetch inspection_id column to minimize data transfer
          const { data: allNotWorkingItems, error: itemsError } = await supabase
            .from("truck_inspection_item_status")
            .select("inspection_id")
            .in("inspection_id", inspectionIds)
            .eq("status", "not_working");

          if (itemsError) throw itemsError;

          // Build count map efficiently
          const inspectionCounts = new Map<string, number>();
          (allNotWorkingItems || []).forEach((item) => {
            const count = inspectionCounts.get(item.inspection_id) || 0;
            inspectionCounts.set(item.inspection_id, count + 1);
          });

          // Map inspection_id counts back to truck_id
          truckToInspectionMap.forEach((inspectionId, truckId) => {
            truckIssuesMap.set(truckId, inspectionCounts.get(inspectionId) || 0);
          });
        }
      } else if (trucksNeedingDetails.length > 100) {
        // For large datasets, use stored compliance_status as approximation
        // This avoids expensive queries
        trucksNeedingDetails.forEach((truck) => {
          if (truck.compliance_status === "restricted" || truck.last_inspection_status === "issues_reported") {
            truckIssuesMap.set(truck.id, 1); // Indicate issues exist
          }
        });
      }

      // Map trucks with their issue counts efficiently
      const trucksWithIssues = trucksData.map((truck) => {
        // Use stored compliance_status for fast filtering, then get actual count if available
        let issuesCount = truckIssuesMap.get(truck.id) || 0;
        
        // If no count but truck shows issues status, indicate issues exist
        if (issuesCount === 0 && (truck.last_inspection_status === "issues_reported" || truck.compliance_status === "restricted")) {
          issuesCount = 1; // Indicates issues exist (exact count may require refresh)
        }

        return {
          ...truck,
          carrier_name: (truck.carrier as any)?.name || "Unknown",
          issues_count: issuesCount,
        };
      });

      // Sort trucks: those with issues first, then by created_at descending
      const sortedTrucks = trucksWithIssues.sort((a, b) => {
        const aHasIssues = (a.issues_count || 0) > 0 || a.compliance_status === "restricted";
        const bHasIssues = (b.issues_count || 0) > 0 || b.compliance_status === "restricted";
        
        // If one has issues and the other doesn't, prioritize the one with issues
        if (aHasIssues && !bHasIssues) return -1;
        if (!aHasIssues && bHasIssues) return 1;
        
        // If both have issues or both don't, sort by issues count (descending), then by created_at
        if (aHasIssues && bHasIssues) {
          const issuesDiff = (b.issues_count || 0) - (a.issues_count || 0);
          if (issuesDiff !== 0) return issuesDiff;
        }
        
        // Finally, sort by created_at descending
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTrucks(sortedTrucks);
    } catch (error: any) {
      console.error("Error loading fleet data:", error);
      toast({
        title: "Error",
        description: "Failed to load fleet data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (truck: TruckWithCompliance) => {
    setSelectedTruck(truck);
    setEditForm({
      compliance_status: truck.compliance_status || "active",
      admin_notes: truck.admin_notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleViewInspection = async (truck: TruckWithCompliance) => {
    setSelectedTruck(truck);
    
    try {
      // Get latest inspection
      const { data: latestInspection } = await supabase
        .from("truck_daily_inspections")
        .select("id, inspection_date")
        .eq("truck_id", truck.id)
        .order("inspection_date", { ascending: false })
        .limit(1)
        .single();

      if (!latestInspection) {
        toast({
          title: "No Inspection Found",
          description: "This truck has no inspection records yet.",
        });
        return;
      }

      // Get all "not_working" items from the inspection
      const { data: issues } = await supabase
        .from("truck_inspection_item_status")
        .select(`
          status,
          notes,
          checked_at,
          item:truck_inspection_items(item_name)
        `)
        .eq("inspection_id", latestInspection.id)
        .eq("status", "not_working");

      const formattedIssues = (issues || []).map((issue: any) => ({
        item_name: issue.item?.item_name || "Unknown Item",
        notes: issue.notes || "No notes provided",
        status: issue.status,
        checked_at: issue.checked_at,
      }));

      setInspectionIssues(formattedIssues);
      setInspectionDialogOpen(true);
    } catch (error: any) {
      console.error("Error loading inspection:", error);
      toast({
        title: "Error",
        description: "Failed to load inspection details",
        variant: "destructive",
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedTruck) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("trucks")
        .update({
          compliance_status: editForm.compliance_status,
          admin_notes: editForm.admin_notes,
        })
        .eq("id", selectedTruck.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Truck compliance status updated successfully",
      });

      setEditDialogOpen(false);
      loadFleetData(); // Reload data
    } catch (error: any) {
      console.error("Error updating truck:", error);
      toast({
        title: "Error",
        description: "Failed to update truck status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "restricted":
        return <Badge className="bg-red-500">Restricted</Badge>;
      case "inactive":
        return <Badge className="bg-gray-500">Inactive</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getInspectionStatusIcon = (issuesCount: number) => {
    if (issuesCount === 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  // Filter trucks based on compliance status and issues filters
  const filteredTrucks = trucks.filter((truck) => {
    // Compliance status filter
    if (complianceFilter !== "all") {
      if (complianceFilter === "restricted") {
        // Show restricted trucks (has issues OR compliance_status is "restricted")
        const hasIssues = (truck.issues_count || 0) > 0;
        const isRestricted = truck.compliance_status === "restricted";
        if (!hasIssues && !isRestricted) return false;
      } else if (truck.compliance_status !== complianceFilter) {
        return false;
      }
    }

    // Issues filter
    if (issuesFilter === "with_issues") {
      if ((truck.issues_count || 0) === 0) return false;
    } else if (issuesFilter === "no_issues") {
      if ((truck.issues_count || 0) > 0) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Fleet Compliance Management</h3>
        <p className="text-sm text-muted-foreground">
          Monitor truck inspections and manage compliance status. Trucks with reported issues are automatically flagged for admin review.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1 max-w-xs">
          <Label htmlFor="compliance-filter">Compliance Status</Label>
          <Select value={complianceFilter} onValueChange={setComplianceFilter}>
            <SelectTrigger id="compliance-filter">
              <SelectValue placeholder="Filter by compliance status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="restricted">Restricted Only</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 flex-1 max-w-xs">
          <Label htmlFor="issues-filter">Issues</Label>
          <Select value={issuesFilter} onValueChange={setIssuesFilter}>
            <SelectTrigger id="issues-filter">
              <SelectValue placeholder="Filter by issues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trucks</SelectItem>
              <SelectItem value="with_issues">With Issues</SelectItem>
              <SelectItem value="no_issues">No Issues</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trucks Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Truck ID</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>License Plate</TableHead>
              <TableHead>VIN</TableHead>
              <TableHead>Inspection Status</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Compliance Status</TableHead>
              <TableHead>Last Inspection</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredTrucks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  No trucks found matching the selected filters
                </TableCell>
              </TableRow>
            ) : (
              filteredTrucks.map((truck) => (
                <TableRow key={truck.id}>
                  <TableCell className="font-medium">{truck.truck_id}</TableCell>
                  <TableCell>{truck.carrier_name}</TableCell>
                  <TableCell>{truck.license_plate || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {truck.vin || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getInspectionStatusIcon(truck.issues_count || 0)}
                      {truck.issues_count === 0 ? "No Issues" : `${truck.issues_count} Issue(s)`}
                    </div>
                  </TableCell>
                  <TableCell>
                    {truck.issues_count && truck.issues_count > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInspection(truck)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getComplianceBadge(truck.compliance_status || "active")}
                  </TableCell>
                  <TableCell>
                    {truck.last_inspection_date
                      ? new Date(truck.last_inspection_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {truck.admin_notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(truck)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Compliance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Truck Compliance Status</DialogTitle>
            <DialogDescription>
              Update the compliance status and add admin notes for truck{" "}
              <span className="font-semibold">{selectedTruck?.truck_id}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Compliance Status */}
            <div className="space-y-2">
              <Label htmlFor="compliance_status">Compliance Status</Label>
              <Select
                value={editForm.compliance_status}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, compliance_status: value })
                }
              >
                <SelectTrigger id="compliance_status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Ready to Use)</SelectItem>
                  <SelectItem value="restricted">
                    Restricted (Has Issues - Admin Review)
                  </SelectItem>
                  <SelectItem value="inactive">Inactive (Not Available)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Active: Truck is ready for use | Restricted: Issues reported, needs review | Inactive: Truck not available
              </p>
            </div>

            {/* Admin Notes */}
            <div className="space-y-2">
              <Label htmlFor="admin_notes">Admin Notes</Label>
              <Textarea
                id="admin_notes"
                placeholder="Add notes about compliance issues, restrictions, or actions taken..."
                value={editForm.admin_notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, admin_notes: e.target.value })
                }
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Document any issues, actions taken, or reasons for status changes
              </p>
            </div>

            {/* Current Issue Count */}
            {selectedTruck && selectedTruck.issues_count !== undefined && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  {getInspectionStatusIcon(selectedTruck.issues_count)}
                  <div>
                    <p className="text-sm font-medium">
                      Latest Inspection: {selectedTruck.issues_count === 0 ? "No Issues Reported" : `${selectedTruck.issues_count} Issue(s) Reported`}
                    </p>
                    {selectedTruck.last_inspection_date && (
                      <p className="text-xs text-muted-foreground">
                        Last inspected on {new Date(selectedTruck.last_inspection_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Inspection Issues Dialog */}
      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inspection Issues - {selectedTruck?.truck_id}</DialogTitle>
            <DialogDescription>
              Problems reported during the most recent inspection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {inspectionIssues.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No issues found in the latest inspection
              </div>
            ) : (
              inspectionIssues.map((issue, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold">{issue.item_name}</h4>
                      <p className="text-sm text-muted-foreground">{issue.notes}</p>
                      <p className="text-xs text-muted-foreground">
                        Reported: {new Date(issue.checked_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInspectionDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

