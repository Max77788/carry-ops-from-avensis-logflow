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
import { Plus, Trash2, Edit, Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adminService, CompanyContact } from "@/lib/adminService";
import { toast } from "@/hooks/use-toast";

interface CompanyContactsTabProps {
  companyId: string;
  onUpdate?: () => void;
}

export const CompanyContactsTab = ({
  companyId,
  onUpdate,
}: CompanyContactsTabProps) => {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<CompanyContact | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    location: "",
    notes: "",
  });

  useEffect(() => {
    loadContacts();
  }, [companyId]);

  const loadContacts = async () => {
    setIsLoading(true);
    const data = await adminService.getCompanyContacts(companyId);
    setContacts(data);
    setIsLoading(false);
  };

  const handleAdd = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      location: "",
      notes: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (contact: CompanyContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone || "",
      role: contact.role || "",
      location: (contact as any).location || "",
      notes: contact.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let result;
      if (editingContact) {
        result = await adminService.updateCompanyContact(
          editingContact.id,
          formData
        );
      } else {
        // Auto-set first contact as primary
        const isFirstContact = contacts.length === 0;
        result = await adminService.createCompanyContact({
          company_id: companyId,
          ...formData,
          is_primary: isFirstContact,
        });
      }

      if (result.success) {
        toast({
          title: "Success",
          description: `Contact ${
            editingContact ? "updated" : "created"
          } successfully`,
        });
        setShowDialog(false);
        loadContacts();
        onUpdate?.(); // Notify parent to refresh
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save contact",
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
    if (!confirm("Are you sure you want to delete this contact?")) return;

    const result = await adminService.deleteCompanyContact(id);
    if (result.success) {
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
      loadContacts();
      onUpdate?.(); // Notify parent to refresh
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    const result = await adminService.setContactAsPrimary(contactId, companyId);
    if (result.success) {
      toast({
        title: "Success",
        description: "Primary contact updated successfully",
      });
      loadContacts();
      onUpdate?.(); // Notify parent to refresh
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to set primary contact",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Contacts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Company Contacts</h3>
            <p className="text-sm text-muted-foreground">
              Manage contact information for this company
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No contacts found
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.name}
                    </TableCell>
                    <TableCell>{contact.email || "-"}</TableCell>
                    <TableCell>{contact.phone || "-"}</TableCell>
                    <TableCell>{contact.role || "-"}</TableCell>
                    <TableCell>{(contact as any).location || "-"}</TableCell>
                    <TableCell>
                      {contact.is_primary && (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {contacts.length > 1 && !contact.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(contact.id)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(contact)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(contact.id)}
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
      </div>

      {/* Add/Edit Contact Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update contact information"
                : "Add a new contact for this company"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="e.g., Owner, Operations, Finance"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="e.g., Main Office, Warehouse"
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
            <Button onClick={handleSave} disabled={isSaving || !formData.name}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingContact ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
