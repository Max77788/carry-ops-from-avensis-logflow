import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye, Lock, KeyRound } from "lucide-react";
import {
  adminService,
  Company,
  CompanyStatus,
  CompanyType,
} from "@/lib/adminService";
import { CreateCompanyDialog } from "./CreateCompanyDialog";
import { SetPasswordDialog } from "./SetPasswordDialog";
import { toast } from "@/hooks/use-toast";

export const CompaniesTab = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setIsLoading(true);
    const data = await adminService.getAllCompanies();
    setCompanies(data);
    setIsLoading(false);
  };

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.primary_contact_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      company.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || company.type === filterType;
    const matchesStatus =
      filterStatus === "all" || company.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: CompanyStatus) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Onboarding Submitted":
        return "bg-emerald-500";
      case "Onboarding In Progress":
        return "bg-blue-500";
      case "Onboarding Invited":
        return "bg-yellow-500";
      case "Draft":
        return "bg-gray-500";
      case "Suspended":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTypeColor = (type: CompanyType) => {
    switch (type) {
      case "Carrier":
        return "bg-blue-100 text-blue-800";
      case "Scale House":
        return "bg-purple-100 text-purple-800";
      case "Contractor":
        return "bg-green-100 text-green-800";
      case "Other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCompanyCreated = () => {
    loadCompanies();
    setShowCreateDialog(false);
    toast({
      title: "Success",
      description: "Company created successfully",
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Carrier">Carrier</SelectItem>
              <SelectItem value="Scale House">Scale House</SelectItem>
              <SelectItem value="Destination Client">
                Destination Client
              </SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Onboarding Invited">
                Onboarding Invited
              </SelectItem>
              <SelectItem value="Onboarding In Progress">
                Onboarding In Progress
              </SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Company
        </Button>
      </div>

      {/* Companies Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Email</TableHead>
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
            ) : filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(company.type)}>
                      {company.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(company.status)}>
                      {company.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{company.primary_contact_name || "-"}</TableCell>
                  <TableCell>{company.contact_email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCompany(company);
                          setShowPasswordDialog(true);
                        }}
                        title={
                          company.password_hash
                            ? "Change password"
                            : "Set password"
                        }
                      >
                        {company.password_hash ? (
                          <KeyRound className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/admin/companies/${company.id}`)
                        }
                        title="View company details"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Company Dialog */}
      <CreateCompanyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCompanyCreated}
      />

      {/* Set Password Dialog */}
      {selectedCompany && (
        <SetPasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          company={selectedCompany}
          onSuccess={loadCompanies}
        />
      )}
    </div>
  );
};
