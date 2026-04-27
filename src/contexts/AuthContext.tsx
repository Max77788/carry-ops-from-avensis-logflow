import React, { createContext, useContext, useState, useEffect } from "react";
import type { AuthUser, UserRole, DriverProfile } from "@/lib/types";

interface AuthContextType {
  user: AuthUser | null;
  driverProfile: DriverProfile | null;
  isLoading: boolean;
  login: (role: UserRole, driverId?: string) => void;
  logout: () => void;
  setDriverProfile: (profile: DriverProfile) => void;
  updateDriverStatus: (status: "active" | "inactive") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    const storedProfile = localStorage.getItem("driverProfile");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("authUser");
      }
    }

    if (storedProfile) {
      try {
        setDriverProfile(JSON.parse(storedProfile));
      } catch (error) {
        console.error("Failed to parse stored profile:", error);
        localStorage.removeItem("driverProfile");
      }
    }

    setIsLoading(false);
  }, []);

  const login = (role: UserRole, driverId?: string) => {
    const newUser: AuthUser = {
      id: driverId || `user_${Date.now()}`,
      role,
      driver_id: driverId,
    };
    setUser(newUser);
    localStorage.setItem("authUser", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setDriverProfile(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("driverProfile");
    // Also clear Overview and ScaleHouse authentication
    localStorage.removeItem("overviewAuthenticated");
    localStorage.removeItem("scaleHouseAuthenticated");
  };

  const updateDriverProfile = (profile: DriverProfile) => {
    setDriverProfile(profile);
    localStorage.setItem("driverProfile", JSON.stringify(profile));
  };

  const updateDriverStatus = (status: "active" | "inactive") => {
    if (driverProfile) {
      const updatedProfile = { ...driverProfile, status };
      updateDriverProfile(updatedProfile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        driverProfile,
        isLoading,
        login,
        logout,
        setDriverProfile: updateDriverProfile,
        updateDriverStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
