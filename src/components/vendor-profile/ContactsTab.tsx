import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Edit, X, Star } from "lucide-react";
import { AddressInput } from "@/components/AddressInput";

interface ContactsTabProps {
  contacts: any[];
  setContacts: (contacts: any[]) => void;
  companyId: string;
}

const ContactsTab = ({
  contacts,
  setContacts,
  companyId,
}: ContactsTabProps) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedContact, setEditedContact] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState({
    Contact_Name: "",
    Contact_Phone: "",
    Contact_Email: "",
    Location: "",
    Role: "",
    Notes: "",
  });

  const handleEdit = (contact: any) => {
    setEditingId(contact.id);
    setEditedContact({ ...contact });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedContact(null);
  };

  const handleSaveEdit = async (contactId: number) => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("Contact_Info")
        .update({
          Contact_Name: editedContact.Contact_Name,
          Contact_Phone: editedContact.Contact_Phone,
          Contact_Email: editedContact.Contact_Email,
          Location: editedContact.Location,
          Role: editedContact.Role,
          Notes: editedContact.Notes,
          is_primary: editedContact.is_primary,
        })
        .eq("id", contactId);

      if (error) throw error;

      setContacts(
        contacts.map((c) => (c.id === contactId ? editedContact : c))
      );
      setEditingId(null);
      setEditedContact(null);

      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating contact:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contactId: number) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      const { error } = await supabase
        .from("Contact_Info")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      setContacts(contacts.filter((c) => c.id !== contactId));

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const handleSetPrimary = async (contactId: number) => {
    try {
      setIsSaving(true);

      // First, unset all other contacts as primary
      const { error: unsetError } = await supabase
        .from("Contact_Info")
        .update({ is_primary: false })
        .eq("company_id", companyId);

      if (unsetError) throw unsetError;

      // Then set this contact as primary
      const { error: setPrimaryError } = await supabase
        .from("Contact_Info")
        .update({ is_primary: true })
        .eq("id", contactId);

      if (setPrimaryError) throw setPrimaryError;

      // Update local state
      setContacts(
        contacts.map((c) => ({
          ...c,
          is_primary: c.id === contactId,
        }))
      );

      toast({
        title: "Success",
        description: "Primary contact updated successfully",
      });
    } catch (error: any) {
      console.error("Error setting primary contact:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to set primary contact",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContact = async () => {
    if (
      !newContact.Contact_Name ||
      !newContact.Contact_Phone ||
      !newContact.Contact_Email
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in Name, Phone, and Email fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      // If this is the first contact, set it as primary
      const isFirstContact = contacts.length === 0;

      const { data, error } = await supabase
        .from("Contact_Info")
        .insert({
          company_id: companyId,
          ...newContact,
          is_primary: isFirstContact,
        })
        .select()
        .single();

      if (error) throw error;

      setContacts([...contacts, data]);
      setIsAdding(false);
      setNewContact({
        Contact_Name: "",
        Contact_Phone: "",
        Contact_Email: "",
        Location: "",
        Role: "",
        Notes: "",
      });

      toast({
        title: "Success",
        description: isFirstContact
          ? "Contact added successfully and set as primary"
          : "Contact added successfully",
      });
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add contact",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditedField = (field: string, value: string) => {
    setEditedContact({ ...editedContact, [field]: value });
  };

  const updateNewField = (field: string, value: string) => {
    setNewContact({ ...newContact, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Contacts</h2>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 border-2 border-primary">
          <h3 className="text-lg font-semibold mb-4">New Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newContact.Contact_Name}
                onChange={(e) => updateNewField("Contact_Name", e.target.value)}
                placeholder="Contact name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={newContact.Contact_Phone}
                onChange={(e) =>
                  updateNewField("Contact_Phone", e.target.value)
                }
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newContact.Contact_Email}
                onChange={(e) =>
                  updateNewField("Contact_Email", e.target.value)
                }
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={newContact.Role}
                onChange={(e) => updateNewField("Role", e.target.value)}
                placeholder="Job title/role"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Location</Label>
              <AddressInput
                value={newContact.Location}
                onChange={(value) => updateNewField("Location", value)}
                placeholder="Location/office"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={newContact.Notes}
                onChange={(e) => updateNewField("Notes", e.target.value)}
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
            <Button onClick={handleAddContact} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Add Contact
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {contacts.length === 0 && !isAdding && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No contacts added yet</p>
        </Card>
      )}

      {contacts.map((contact) => (
        <Card key={contact.id} className="p-6">
          {editingId === contact.id ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Contact</h3>
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
                    onClick={() => handleSaveEdit(contact.id)}
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
                  <Label>Name *</Label>
                  <Input
                    value={editedContact.Contact_Name || ""}
                    onChange={(e) =>
                      updateEditedField("Contact_Name", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={editedContact.Contact_Phone || ""}
                    onChange={(e) =>
                      updateEditedField("Contact_Phone", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={editedContact.Contact_Email || ""}
                    onChange={(e) =>
                      updateEditedField("Contact_Email", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value={editedContact.Role || ""}
                    onChange={(e) => updateEditedField("Role", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Location</Label>
                  <AddressInput
                    value={editedContact.Location || ""}
                    onChange={(value) => updateEditedField("Location", value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editedContact.Notes || ""}
                    onChange={(e) => updateEditedField("Notes", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">
                      {contact.Contact_Name}
                    </h3>
                    {contact.is_primary && (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">
                        <Star className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  {contact.Role && (
                    <p className="text-sm text-muted-foreground">
                      {contact.Role}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {contacts.length > 1 && !contact.is_primary && (
                    <Button
                      onClick={() => handleSetPrimary(contact.id)}
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Set as Primary
                    </Button>
                  )}
                  <Button
                    onClick={() => handleEdit(contact)}
                    size="sm"
                    variant="outline"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(contact.id)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{contact.Contact_Phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{contact.Contact_Email || "N/A"}</p>
                </div>
                {contact.Location && (
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Location</p>
                    <p>{contact.Location}</p>
                  </div>
                )}
                {contact.Notes && (
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p>{contact.Notes}</p>
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

export default ContactsTab;
