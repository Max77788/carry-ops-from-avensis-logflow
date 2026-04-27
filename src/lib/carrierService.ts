import { supabase } from "./supabase";
import CryptoJS from "crypto-js";

export interface Carrier {
  id: string;
  name: string;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface Truck {
  id: string;
  truck_id: string;
  carrier_id: string;
  status?: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  carrier_id: string;
  default_truck_id: string;
  driver_qr_code: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export const carrierService = {
  // ============================================================================
  // CARRIERS
  // ============================================================================

  async getAllCarriers(tableName: string = "companies"): Promise<Carrier[]> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching carriers:", error);
      return [];
    }
  },

  async createCarrier(
    name: string,
    tableName: string = "companies"
  ): Promise<{ success: boolean; data?: Carrier; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create carrier";
      console.error("Error creating carrier:", error);
      return { success: false, error: errorMessage };
    }
  },

  async getCarrierById(
    id: string,
    tableName: string = "companies"
  ): Promise<Carrier | null> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching carrier by id:", error);
      return null;
    }
  },

  async getCarrierByName(
    name: string,
    tableName: string = "companies"
  ): Promise<Carrier | null> {
    try {
      console.log("getCarrierByName called with:", name);

      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("name", name)
        .single();

      console.log("getCarrierByName response:", { data, error });

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching carrier by name:", error);
      return null;
    }
  },

  async getOrCreateCarrier(
    name: string,
    tableName: string = "companies"
  ): Promise<{ success: boolean; data?: Carrier; error?: string }> {
    try {
      // First try to find existing carrier
      const existing = await this.getCarrierByName(name, tableName);
      if (existing) {
        return { success: true, data: existing };
      }

      // If not found, create it
      return await this.createCarrier(name, tableName);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to get or create carrier";
      console.error("Error in getOrCreateCarrier:", error);
      return { success: false, error: errorMessage };
    }
  },

  async authenticateCarrier(
    name: string,
    password: string,
    tableName: string = "companies"
  ): Promise<{ success: boolean; data?: Carrier; error?: string }> {
    try {
      // Get carrier by name
      const carrier = await this.getCarrierByName(name, tableName);

      if (!carrier) {
        return { success: false, error: "Carrier not found" };
      }

      // If carrier doesn't have a password hash, they haven't set up password yet
      if (!carrier.password_hash) {
        return {
          success: false,
          error:
            "Password not set for this carrier. Please contact administrator.",
        };
      }

      // Hash the provided password using SHA-256
      const hashedPassword = CryptoJS.SHA256(password).toString();

      // Compare with stored hash
      if (hashedPassword === carrier.password_hash) {
        return { success: true, data: carrier };
      } else {
        return { success: false, error: "Invalid password" };
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Authentication failed";
      console.error("Error authenticating carrier:", error);
      return { success: false, error: errorMessage };
    }
  },

  async updateCarrier(
    carrierId: string,
    updates: Partial<Carrier>,
    tableName: string = "companies"
  ): Promise<{ success: boolean; data?: Carrier; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates as any)
        .eq("id", carrierId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update carrier";
      console.error("Error updating carrier:", error);
      return { success: false, error: errorMessage };
    }
  },

  async setCarrierPassword(
    carrierId: string,
    password: string,
    tableName: string = "companies"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate password strength (minimum 8 characters)
      if (password.length < 8) {
        return {
          success: false,
          error: "Password must be at least 8 characters long",
        };
      }

      // Hash the password using SHA-256
      const passwordHash = CryptoJS.SHA256(password).toString();

      // Update carrier with hashed password and plain password
      const { error } = await supabase
        .from(tableName)
        .update({
          password_hash: passwordHash,
          plain_password: password, // Store plain password for admin reference
        } as any)
        .eq("id", carrierId);

      if (error) {
        console.error("Error setting password:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to set password";
      console.error("Error in setCarrierPassword:", error);
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // TRUCKS
  // ============================================================================
  // Note: Trucks no longer have driver_id. The relationship is reversed:
  // drivers.default_truck_id points to trucks.id
  // Truck status is managed based on driver status and assignments

  async getTrucksByCarrier(carrierId: string): Promise<Truck[]> {
    try {
      // Get all trucks for the carrier
      const { data: trucks, error: trucksError } = await supabase
        .from("trucks")
        .select("*")
        .eq("carrier_id", carrierId)
        .order("truck_id", { ascending: true });

      if (trucksError) throw trucksError;

      return trucks || [];
    } catch (error) {
      console.error("Error fetching trucks:", error);
      return [];
    }
  },

  /**
   * Get available trucks for a carrier
   * A truck is available if no driver has it as their default_truck_id
   * @param carrierId - The carrier's UUID
   * @returns Array of available trucks
   */
  async getAvailableTrucksByCarrier(carrierId: string): Promise<Truck[]> {
    try {
      // Get all trucks for the carrier
      const { data: trucks, error: trucksError } = await supabase
        .from("trucks")
        .select("*")
        .eq("carrier_id", carrierId)
        .order("truck_id", { ascending: true });

      if (trucksError) throw trucksError;

      // Get all drivers with their default_truck_id for this carrier
      const { data: drivers, error: driversError } = await supabase
        .from("drivers")
        .select("default_truck_id")
        .eq("carrier_id", carrierId)
        .not("default_truck_id", "is", null);

      if (driversError) throw driversError;

      // Create a set of truck IDs that are assigned to drivers
      const assignedTruckIds = new Set(
        (drivers || []).map((d: any) => d.default_truck_id)
      );

      // Filter out trucks that are assigned to drivers
      const availableTrucks = (trucks || []).filter(
        (truck: any) => !assignedTruckIds.has(truck.id)
      );

      console.log("Available trucks:", availableTrucks);

      return availableTrucks;
    } catch (error) {
      console.error("Error fetching available trucks:", error);
      return [];
    }
  },

  async createTruck(
    truckId: string,
    carrierId: string,
    status: "active" | "inactive" = "active"
  ): Promise<{ success: boolean; data?: Truck; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .insert({ truck_id: truckId, carrier_id: carrierId, status })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create truck";
      console.error("Error creating truck:", error);
      return { success: false, error: errorMessage };
    }
  },

  async updateTruck(
    truckUuid: string,
    updates: Partial<Truck>
  ): Promise<{ success: boolean; data?: Truck; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .update(updates as any)
        .eq("id", truckUuid)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update truck";
      console.error("Error updating truck:", error);
      return { success: false, error: errorMessage };
    }
  },

  async deleteTruck(
    truckUuid: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("trucks")
        .delete()
        .eq("id", truckUuid);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete truck";
      console.error("Error deleting truck:", error);
      return { success: false, error: errorMessage };
    }
  },

  async getTruckById(truckUuid: string): Promise<Truck | null> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .select("*")
        .eq("id", truckUuid)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching truck by UUID:", error);
      return null;
    }
  },

  async getTruckByIdAndCarrier(
    truckId: string,
    carrierId: string
  ): Promise<Truck | null> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .select("*")
        .eq("truck_id", truckId)
        .eq("carrier_id", carrierId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching truck:", error);
      return null;
    }
  },

  async getOrCreateTruck(
    truckId: string,
    carrierId: string
  ): Promise<{ success: boolean; data?: Truck; error?: string }> {
    try {
      // First try to find existing truck
      const existing = await this.getTruckByIdAndCarrier(truckId, carrierId);
      if (existing) {
        return { success: true, data: existing };
      }

      // If not found, create it
      return await this.createTruck(truckId, carrierId);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to get or create truck";
      console.error("Error in getOrCreateTruck:", error);
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Update truck status (active/inactive)
   * Called when:
   * - Driver changes status (truck status should match driver status)
   * - Driver changes trucks (old truck → inactive, new truck → driver's status)
   * @param truckId - The truck's UUID
   * @param status - 'active' or 'inactive'
   */
  async updateTruckStatus(
    truckId: string,
    status: "active" | "inactive"
  ): Promise<{ success: boolean; data?: Truck; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("trucks")
        .update({ status } as any)
        .eq("id", truckId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update truck status";
      console.error("Error updating truck status:", error);
      return { success: false, error: errorMessage };
    }
  },

  // ============================================================================
  // DRIVERS
  // ============================================================================

  async getDriversByCarrier(carrierId: string): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("carrier_id", carrierId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching drivers:", error);
      return [];
    }
  },

  async createDriver(
    name: string,
    carrierId: string,
    email: string,
    defaultTruckId: string
  ): Promise<{ success: boolean; data?: Driver; error?: string }> {
    try {
      // Generate driver QR code
      const driverQrCode = `DRIVER-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const { data, error } = await supabase
        .from("drivers")
        .insert({
          name,
          email,
          carrier_id: carrierId,
          default_truck_id: defaultTruckId,
          driver_qr_code: driverQrCode,
          status: "inactive",
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create driver";
      console.error("Error creating driver:", error);
      return { success: false, error: errorMessage };
    }
  },

  async getDriverByEmail(email: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("email", email)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching driver by email:", error);
      return null;
    }
  },

  async getDriverByPhone(phone: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("phone", phone)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching driver by phone:", error);
      return null;
    }
  },

  async getDriverByEmailOrPhone(emailOrPhone: string): Promise<Driver | null> {
    try {
      // First try to find by email
      const { data: emailData, error: emailError } = await supabase
        .from("drivers")
        .select("*")
        .eq("email", emailOrPhone)
        .maybeSingle();

      if (emailData) {
        return emailData;
      }

      // If not found by email, try by phone
      const { data: phoneData, error: phoneError } = await supabase
        .from("drivers")
        .select("*")
        .eq("phone", emailOrPhone)
        .maybeSingle();

      if (phoneData) {
        return phoneData;
      }

      return null;
    } catch (error) {
      console.error("Error fetching driver by email or phone:", error);
      return null;
    }
  },

  async getDriverByQRCode(qrCode: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("driver_qr_code", qrCode)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching driver by QR code:", error);
      return null;
    }
  },

  async getDriverById(driverId: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching driver by ID:", error);
      return null;
    }
  },

  async updateDriverStatus(
    driverId: string,
    status: "active" | "inactive"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ status })
        .eq("id", driverId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update driver status";
      console.error("Error updating driver status:", error);
      return { success: false, error: errorMessage };
    }
  },

  async updateDriver(
    driverId: string,
    updates: Partial<Driver>
  ): Promise<{ success: boolean; data?: Driver; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .update(updates as any)
        .eq("id", driverId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update driver";
      console.error("Error updating driver:", error);
      return { success: false, error: errorMessage };
    }
  },

  async deleteDriver(
    driverId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", driverId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete driver";
      console.error("Error deleting driver:", error);
      return { success: false, error: errorMessage };
    }
  },

  async updateDriverProfile(
    driverId: string,
    updates: {
      default_truck_id?: string;
      carrier_id?: string;
    }
  ): Promise<{ success: boolean; data?: Driver; error?: string }> {
    try {
      console.log("updateDriverProfile called with:", { driverId, updates });

      // Perform the update directly without checking first
      const { data, error } = await supabase
        .from("drivers")
        .update(updates)
        .eq("id", driverId)
        .select();

      console.log("Update response:", { data, error });

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      // Return the first updated record (should be only one)
      if (!data || data.length === 0) {
        throw new Error("Update returned no rows - driver may not exist");
      }

      console.log("Update successful:", data[0]);
      return { success: true, data: data[0] };
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update driver profile";
      console.error("Error updating driver profile:", error);
      return { success: false, error: errorMessage };
    }
  },

  async getAllDrivers(): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching all drivers:", error);
      return [];
    }
  },

  // ============================================================================
  // COMBINED OPERATIONS
  // ============================================================================

  async getCarrierWithTrucksAndDrivers(
    carrierId: string,
    tableName: string = "companies"
  ): Promise<{
    carrier: Carrier | null;
    trucks: Truck[];
    drivers: Driver[];
  }> {
    try {
      const { data: carrier, error: carrierError } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", carrierId)
        .single();

      if (carrierError) throw carrierError;

      const trucks = await this.getTrucksByCarrier(carrierId);
      const drivers = await this.getDriversByCarrier(carrierId);

      return { carrier, trucks, drivers };
    } catch (error) {
      console.error("Error fetching carrier details:", error);
      return { carrier: null, trucks: [], drivers: [] };
    }
  },
};
