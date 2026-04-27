import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface LogoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectPath?: string;
}

/**
 * Get the appropriate login page based on the user's role
 */
const getLoginPageForRole = (role?: UserRole): string => {
  if (!role) return "/driver/login";

  switch (role) {
    case "admin":
      return "/login";
    case "attendant":
      return "/login";
    case "driver":
      return "/driver/login";
    case "carrier":
      return "/carrier/login";
    default:
      return "/driver/login";
  }
};

export const LogoutModal: React.FC<LogoutModalProps> = ({
  open,
  onOpenChange,
  redirectPath,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    // Use provided redirectPath, or determine based on user role
    const targetPath = redirectPath || getLoginPageForRole(user?.role);
    navigate(targetPath);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to log out?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="sm:order-1">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            className="sm:order-2 bg-red-500 hover:bg-red-600"
          >
            Logout
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
