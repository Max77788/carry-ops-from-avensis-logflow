import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useShipperAuth } from "@/contexts/ShipperAuthContext";
import {
  Building2,
  LogOut,
  Plus,
  Truck,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ShipperLayout: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useShipperAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/shipper/login", { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors",
      isActive
        ? "bg-primary text-primary-foreground shadow-glow"
        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/82 shadow-sm backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/shipper/loads" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-glow">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold">Shipper Portal</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/shipper/loads" className={linkClass}>
              <ListChecks className="h-4 w-4" />
              Load board
            </NavLink>
            <NavLink to="/shipper/loads/new" className={linkClass}>
              <Plus className="h-4 w-4" />
              Post load
            </NavLink>
            <NavLink to="/shipper/carriers" className={linkClass}>
              <Truck className="h-4 w-4" />
              Carriers
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium leading-tight">
                {profile?.company_name ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                {user?.email}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>

        <nav className="md:hidden border-t border-primary/10 bg-background/82">
          <div className="container mx-auto px-2 py-2 flex items-center gap-1 overflow-x-auto">
            <NavLink to="/shipper/loads" className={linkClass}>
              <ListChecks className="h-4 w-4" />
              Loads
            </NavLink>
            <NavLink to="/shipper/loads/new" className={linkClass}>
              <Plus className="h-4 w-4" />
              Post
            </NavLink>
            <NavLink to="/shipper/carriers" className={linkClass}>
              <Truck className="h-4 w-4" />
              Carriers
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default ShipperLayout;
