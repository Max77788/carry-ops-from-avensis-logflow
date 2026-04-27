import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Loader2, Search } from "lucide-react";
import { adminService, PickupSite, Company } from "@/lib/adminService";
import { toast } from "@/hooks/use-toast";

export const PickupSitesTab = () => {
  const [sites, setSites] = useState<PickupSite[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<PickupSite | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    gps_location: "",
    address: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log("Starting to load pickup sites data...");

      const sitesData = await adminService.getAllPickupSites();
      console.log("Loaded pickup sites:", sitesData.length, sitesData);

      const companiesData = await adminService.getAllCompanies();
      console.log("Loaded companies:", companiesData.length, companiesData);

      // Filter companies to show only "Scale House" type
      const scaleHouseCompanies = companiesData.filter(
        (company) => company.type === "Scale House"
      );
      console.log(
        "Filtered Scale House companies:",
        scaleHouseCompanies.length
      );

      setSites(sitesData);
      setCompanies(scaleHouseCompanies);

      console.log(
        "State updated - sites:",
        sitesData.length,
        "companies:",
        scaleHouseCompanies.length
      );
    } catch (error) {
      console.error("Error loading pickup sites data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSite(null);
    setFormData({
      company_id: "",
      name: "",
      gps_location: "",
      address: "",
      description: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (site: PickupSite) => {
    setEditingSite(site);
    setFormData({
      company_id: site.company_id,
      name: site.name,
      gps_location: site.gps_location || "",
      address: site.address || "",
      description: site.description || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.company_id || !formData.name) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let result;
      if (editingSite) {
        result = await adminService.updatePickupSite(editingSite.id, formData);
      } else {
        result = await adminService.createPickupSite(formData);
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Site ${
            editingSite ? "updated" : "created"
          } successfully`,
        });
        setShowDialog(false);
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save site",
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this site?")) return;

    const result = await adminService.deletePickupSite(id);
    if (result.success) {
      toast({
        title: "Success",
        description: "Site deleted successfully",
      });
      loadData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete site",
        variant: "destructive",
      });
    }
  };

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "Not assigned";
    const company = companies.find((c) => c.id === companyId);
    return company?.name || "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Site
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>GPS Location</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredSites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No sites found
                </TableCell>
              </TableRow>
            ) : (
              filteredSites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell>{getCompanyName(site.company_id)}</TableCell>
                  <TableCell>{site.gps_location || "-"}</TableCell>
                  <TableCell>{site.address || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(site)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(site.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSite ? "Edit Pickup Site" : "Add Pickup Site"}
            </DialogTitle>
            <DialogDescription>
              {editingSite
                ? "Update pickup site information"
                : "Add a new pickup/scale house site"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company_id">Company *</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, company_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Site Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gps_location">GPS Location</Label>
              <Input
                id="gps_location"
                value={formData.gps_location}
                onChange={(e) =>
                  setFormData({ ...formData, gps_location: e.target.value })
                }
                placeholder="lat,long"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
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
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.company_id || !formData.name}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSite ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
