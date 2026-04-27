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
import { Plus, Edit, Trash2, Loader2, Search, Upload, Download } from "lucide-react";
import { adminService, DestinationSite, Company } from "@/lib/adminService";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";

export const DestinationSitesTab = () => {
  const [sites, setSites] = useState<DestinationSite[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<DestinationSite | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    default_email: "",
    gps_location: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log("Starting to load data...");

      const sitesData = await adminService.getAllDestinationSites();
      console.log("Loaded destination sites:", sitesData.length, sitesData);

      const companiesData = await adminService.getAllCompanies();
      console.log("Loaded companies:", companiesData.length, companiesData);

      // Filter companies to show only "Destination Client" type (support both old "Contractor" and new "Destination Client")
      const contractorCompanies = companiesData.filter(
        (company) => company.type === "Destination Client" || company.type === "Contractor"
      );
      console.log("Filtered Contractor companies:", contractorCompanies.length);

      setSites(sitesData);
      setCompanies(contractorCompanies);

      console.log(
        "State updated - sites:",
        sitesData.length,
        "companies:",
        contractorCompanies.length
      );
    } catch (error) {
      console.error("Error loading data:", error);
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
      address: "",
      city: "",
      state: "",
      zip: "",
      default_email: "",
      gps_location: "",
      notes: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (site: DestinationSite) => {
    setEditingSite(site);
    setFormData({
      company_id: site.company_id,
      name: site.name,
      address: site.address || "",
      city: site.city || "",
      state: site.state || "",
      zip: site.zip || "",
      default_email: site.default_email || "",
      gps_location: site.gps_location || "",
      notes: site.notes || "",
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
        result = await adminService.updateDestinationSite(
          editingSite.id,
          formData
        );
      } else {
        result = await adminService.createDestinationSite(formData);
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

    const result = await adminService.deleteDestinationSite(id);
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
      site.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.name || "Unknown";
  };

  // UUID validation helper
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Resolve company name to company_id
  const resolveCompanyId = (companyIdentifier: string): string | null => {
    if (!companyIdentifier || companyIdentifier.trim() === "") {
      return null;
    }

    const trimmed = companyIdentifier.trim();

    // If it's already a valid UUID, return it
    if (isValidUUID(trimmed)) {
      return trimmed;
    }

    // Otherwise, try to find by company name
    const company = companies.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );

    return company?.id || null;
  };

  // Handle CSV Upload
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          console.log("Destination Sites CSV parsed:", results.data);

          if (results.data.length === 0) {
            toast({
              title: "Error",
              description: "CSV file is empty or has no valid data",
              variant: "destructive",
            });
            setIsUploading(false);
            return;
          }

          // Validate required fields and resolve company_id
          const invalidRows: Array<{ row: number; error: string }> = [];
          const processedRows: Array<{ row: any; company_id: string }> = [];

          results.data.forEach((row: any, index: number) => {
            const rowNumber = index + 2; // +2 because index is 0-based and CSV has header

            // Check if name is provided
            if (!row.name || row.name.trim() === "") {
              invalidRows.push({
                row: rowNumber,
                error: "Missing required field: name",
              });
              return;
            }

            // Check if company_id or company_name is provided
            const companyIdentifier = row.company_id?.trim() || row.company_name?.trim() || "";
            if (!companyIdentifier) {
              invalidRows.push({
                row: rowNumber,
                error: "Missing required field: company_id or company_name",
              });
              return;
            }

            // Resolve company_id
            const resolvedCompanyId = resolveCompanyId(companyIdentifier);
            if (!resolvedCompanyId) {
              invalidRows.push({
                row: rowNumber,
                error: `Company not found: "${companyIdentifier}". Use a valid UUID or company name.`,
              });
              return;
            }

            processedRows.push({
              row,
              company_id: resolvedCompanyId,
            });
          });

          if (invalidRows.length > 0) {
            const errorMessages = invalidRows
              .map((err) => `Row ${err.row}: ${err.error}`)
              .join("\n");
            
            // Check if the error is about placeholder values
            const hasPlaceholderError = invalidRows.some(err => 
              err.error.includes("COMPANY_ID_") || err.error.includes("company_id")
            );
            
            let description = `Please fix the following errors:\n${errorMessages}`;
            if (hasPlaceholderError) {
              description += "\n\n💡 Tip: Download a new template using the 'Download Template' button to get actual company names instead of placeholders.";
            }
            
            toast({
              title: "Validation Error",
              description: description,
              variant: "destructive",
              duration: 10000, // Show longer for this error
            });
            setIsUploading(false);
            return;
          }

          // Process each row
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (const { row, company_id } of processedRows) {
            try {
              const siteData = {
                company_id: company_id,
                name: row.name?.trim() || "",
                address: row.address?.trim() || "",
                city: row.city?.trim() || "",
                state: row.state?.trim() || "",
                zip: row.zip?.trim() || "",
                default_email: row.default_email?.trim() || "",
                gps_location: row.gps_location?.trim() || "",
                notes: row.notes?.trim() || "",
              };

              const result = await adminService.createDestinationSite(siteData);
              if (result.success) {
                successCount++;
              } else {
                errorCount++;
                errors.push(`${row.name || "Unknown"}: ${result.error || "Failed"}`);
              }
            } catch (error: any) {
              errorCount++;
              errors.push(`${row.name || "Unknown"}: ${error.message || "Error"}`);
            }
          }

          // Show results
          if (successCount > 0) {
            toast({
              title: "Upload Complete",
              description: `Successfully created ${successCount} site(s)${
                errorCount > 0 ? `. ${errorCount} failed.` : "."
              }`,
            });
            loadData(); // Reload the list
          }

          if (errorCount > 0 && errors.length > 0) {
            console.error("Upload errors:", errors);
            toast({
              title: "Some Sites Failed",
              description: `${errorCount} site(s) failed to create. Check console for details.`,
              variant: "destructive",
            });
          }

          setIsUploading(false);
        },
        error: (error) => {
          console.error("CSV parse error:", error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          });
          setIsUploading(false);
        },
      });
    } catch (error: any) {
      console.error("Error processing CSV:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process CSV file",
        variant: "destructive",
      });
      setIsUploading(false);
    }

    // Reset file input
    e.target.value = "";
  };

  // Download CSV Template
  const downloadTemplate = () => {
    // Get first few companies for example - filter to only Destination Client companies
    const destinationCompanies = companies.filter(
      (c) => c.type === "Destination Client" || c.type === "Contractor"
    );
    
    if (destinationCompanies.length === 0) {
      toast({
        title: "No Companies Available",
        description: "Please create at least one Destination Client company before downloading the template.",
        variant: "destructive",
      });
      return;
    }

    const company1 = destinationCompanies[0];
    const company2 = destinationCompanies[1] || destinationCompanies[0];

    // Escape company names for CSV (handle quotes)
    const escapeCsv = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const template = `company_name,name,address,city,state,zip,default_email,gps_location,notes
${escapeCsv(company1.name)},Site Name 1,123 Main St,City,CA,12345,email@example.com,37.7749,-122.4194,Notes here
${escapeCsv(company2.name)},Site Name 2,456 Oak Ave,Town,TX,67890,email2@example.com,32.7767,-96.7970,More notes

IMPORTANT: Use "company_name" column with the exact company name from the list above.
You can also use "company_id" with a valid UUID if you prefer.`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "destination_sites_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: `Template downloaded with example company names: ${company1.name}${company2 !== company1 ? `, ${company2.name}` : ''}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            disabled={isUploading}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <label>
            <Button
              variant="outline"
              asChild
              disabled={isUploading}
              className="cursor-pointer"
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload CSV"}
              </span>
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
          <Button onClick={handleAdd} disabled={isUploading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Site
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredSites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No sites found
                </TableCell>
              </TableRow>
            ) : (
              filteredSites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">{site.name}</TableCell>
                  <TableCell>{getCompanyName(site.company_id)}</TableCell>
                  <TableCell>{site.address || "-"}</TableCell>
                  <TableCell>{site.city || "-"}</TableCell>
                  <TableCell>{site.state || "-"}</TableCell>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSite ? "Edit Destination Site" : "Add Destination Site"}
            </DialogTitle>
            <DialogDescription>
              {editingSite
                ? "Update destination site information"
                : "Add a new destination site"}
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
                  <SelectValue
                    placeholder={
                      companies.length === 0
                        ? "Loading companies..."
                        : "Select company"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {companies.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No companies available
                    </div>
                  ) : (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                  )}
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
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip">Zip</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({ ...formData, zip: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="default_email">Default Email</Label>
              <Input
                id="default_email"
                type="email"
                value={formData.default_email}
                onChange={(e) =>
                  setFormData({ ...formData, default_email: e.target.value })
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
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
