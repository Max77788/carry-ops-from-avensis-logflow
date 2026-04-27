import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ShiftData {
  isActive: boolean;
  startTime: string | null;
  carrier: string | null;
  carrier_id: string | null;
  truck: string | null;
  truck_id: string | null;
  pickupLocation: string | null;
}

interface ShiftContextType {
  shift: ShiftData;
  startShift: (carrier: string, carrier_id: string, truck: string, truck_id: string, pickupLocation: string) => void;
  endShift: () => void;
  updateShift: (data: Partial<ShiftData>) => void;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shift, setShift] = useState<ShiftData>(() => {
    // Load shift from localStorage on mount
    const stored = localStorage.getItem("activeShift");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Failed to parse stored shift:", error);
        return {
          isActive: false,
          startTime: null,
          carrier: null,
          carrier_id: null,
          truck: null,
          truck_id: null,
          pickupLocation: null,
        };
      }
    }
    return {
      isActive: false,
      startTime: null,
      carrier: null,
      carrier_id: null,
      truck: null,
      truck_id: null,
      pickupLocation: null,
    };
  });

  // Persist shift to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeShift", JSON.stringify(shift));
  }, [shift]);

  const startShift = (
    carrier: string,
    carrier_id: string,
    truck: string,
    truck_id: string,
    pickupLocation: string
  ) => {
    const newShift: ShiftData = {
      isActive: true,
      startTime: new Date().toISOString(),
      carrier,
      carrier_id,
      truck,
      truck_id,
      pickupLocation,
    };
    setShift(newShift);
  };

  const endShift = () => {
    setShift({
      isActive: false,
      startTime: null,
      carrier: null,
      carrier_id: null,
      truck: null,
      truck_id: null,
      pickupLocation: null,
    });
  };

  const updateShift = (data: Partial<ShiftData>) => {
    setShift((prev) => ({ ...prev, ...data }));
  };

  return (
    <ShiftContext.Provider value={{ shift, startShift, endShift, updateShift }}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error("useShift must be used within a ShiftProvider");
  }
  return context;
};

