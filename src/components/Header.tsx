import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Home, Settings, LogOut, Truck } from "lucide-react";

interface HeaderProps {
  showSettingsButton?: boolean;
  onSettingsClick?: () => void;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
  showLogoutButton?: boolean;
  onLogoutClick?: () => void;
}

export const Header = ({
  showSettingsButton = false,
  onSettingsClick,
  showHomeButton = false,
  onHomeClick,
  showLogoutButton = false,
  onLogoutClick,
}: HeaderProps) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/82 shadow-sm backdrop-blur-xl">
      <div className="container mx-auto px-3 py-3 md:px-4 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-glow">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold leading-none text-foreground">
                Carry Ops
              </div>
              <div className="hidden text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/80 sm:block">
                Load Control
              </div>
            </div>
          </div>
          {/* Right Section - Settings, Home, Logout, Theme Toggle */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {showSettingsButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSettingsClick}
                className="h-9 w-9 rounded-full border border-border/80 bg-secondary/55 md:h-10 md:w-10"
                title="Settings"
              >
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            {showHomeButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onHomeClick}
                className="h-9 w-9 rounded-full border border-border/80 bg-secondary/55 md:h-10 md:w-10"
                title="Home"
              >
                <Home className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            {showLogoutButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogoutClick}
                className="h-9 w-9 rounded-full border border-border/80 bg-secondary/55 md:h-10 md:w-10"
                title="Logout"
              >
                <LogOut className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full border border-border/80 bg-secondary/55 md:h-10 md:w-10"
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? (
                <Sun className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Moon className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
