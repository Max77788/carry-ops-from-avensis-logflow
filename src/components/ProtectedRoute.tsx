import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

/**
 * Get the appropriate login page based on the required role
 */
const getLoginPageForRole = (requiredRole?: UserRole | UserRole[]): string => {
  // If no specific role is required, default to driver login
  if (!requiredRole) {
    return "/driver/login";
  }

  // If multiple roles are allowed, use the first one to determine login page
  const role = Array.isArray(requiredRole) ? requiredRole[0] : requiredRole;

  switch (role) {
    case "admin":
      return "/login"; // Admin uses the main login page
    case "attendant":
      return "/login"; // Attendant uses the main login page
    case "driver":
      return "/driver/login";
    case "carrier":
      return "/carrier/login";
    default:
      return "/driver/login";
  }
};

/**
 * Get the appropriate login page based on the user's current role
 */
const getLoginPageForUser = (userRole: UserRole): string => {
  switch (userRole) {
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

/**
 * ProtectedRoute component that redirects unauthenticated users to login
 * Optionally enforces a specific role requirement or multiple roles
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, isLoading } = useAuth();

  // Show nothing while loading auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to appropriate login page if not authenticated
  if (!user) {
    const loginPage = getLoginPageForRole(requiredRole);
    return <Navigate to={loginPage} replace />;
  }

  // Check role if required
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      // Redirect to the user's own login page if they don't have permission
      const loginPage = getLoginPageForUser(user.role);
      return <Navigate to={loginPage} replace />;
    }
  }

  return <>{children}</>;
};
