import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { adminService, Company } from "@/lib/adminService";
import { toast } from "@/hooks/use-toast";

interface DeleteCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  onSuccess?: () => void;
  onDelete?: () => void; // Called after successful deletion for navigation
}

export const DeleteCompanyDialog = ({
  open,
  onOpenChange,
  company,
  onSuccess,
  onDelete,
}: DeleteCompanyDialogProps) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClose = () => {
    setConfirmationText("");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (confirmationText !== company.name) {
      toast({
        title: "Error",
        description: "Company name does not match",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const result = await adminService.deleteCompany(company.id);

      if (result.success) {
        toast({
          title: "Success",
          description: `Company "${company.name}" has been permanently deleted`,
        });
        handleClose();

        // Call onDelete first for navigation, then onSuccess for any cleanup
        if (onDelete) {
          onDelete();
        } else if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete company",
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
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">Delete Company</DialogTitle>
              <DialogDescription className="text-base">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4">
            <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">
              ⚠️ Warning: This is a destructive operation
            </h4>
            <p className="text-sm text-red-800 dark:text-red-300 mb-2">
              Deleting this company will permanently remove:
            </p>
            <ul className="text-sm text-red-800 dark:text-red-300 list-disc list-inside space-y-1 ml-2">
              <li>All company information and settings</li>
              <li>All associated contacts</li>
              <li>All trucks, trailers, and drivers</li>
              <li>All onboarding data and documents</li>
              <li>Portal access credentials</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-base font-semibold">
              Type the company name to confirm deletion:
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Please type{" "}
              <span className="font-mono font-bold text-foreground">
                {company.name}
              </span>{" "}
              to confirm
            </p>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Type "${company.name}" here`}
              className="font-mono"
              autoComplete="off"
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmationText !== company.name || isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Company Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
