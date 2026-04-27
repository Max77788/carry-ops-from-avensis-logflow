// src/lib/truckService.ts
import { supabase } from "./supabase";

export type Truck = {
  id: string;
  truck_id: string;
  carrier_id: string;
  created_at?: string;
  updated_at?: string;
  carrier_name?: string;
  status?: string;
  driver_name?: string;
  active?: boolean;
};

export type TrucksOverviewParams = {
  limit?: number;
  page?: number;
};

export type TrucksOverviewResponse = {
  trucks: Truck[];
  total: number;
  page: number;
  pageSize: number;
};

export const truckService = {
  async getTrucksOverview(
    params?: TrucksOverviewParams
  ): Promise<TrucksOverviewResponse> {
    const pageSize = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    try {
      // Select trucks with carrier information
      let query = supabase
        .from("trucks")
        .select(
          "id, truck_id, carrier_id, created_at, updated_at, companies(name)",
          {
            count: "exact",
          }
        )
        .order("truck_id", { ascending: true })
        .range(fromIndex, toIndex);

      const { data, error, count } = await query;

      if (error) {
        console.error("getTrucksOverview Supabase error:", error);
        throw new Error(error.message || "Failed to load trucks");
      }

      // Map the data to include carrier_name
      let trucks = (data ?? []).map((truck: any) => ({
        ...truck,
        carrier_name: truck.companies?.name || "Unknown",
      })) as Truck[];
      const total = count ?? trucks.length;

      // Fetch driver information for each truck
      try {
        const { data: drivers, error: driversError } = await supabase
          .from("drivers")
          .select("id, name, default_truck_id, status");

        if (!driversError && drivers) {
          // Create maps for driver_name and active status
          const driverMap = new Map<string, string>();
          const activeMap = new Map<string, boolean>();

          drivers.forEach((driver: any) => {
            if (driver.default_truck_id) {
              driverMap.set(driver.default_truck_id, driver.name);
              // Truck is active if the assigned driver is active
              activeMap.set(
                driver.default_truck_id,
                driver.status === "active"
              );
            }
          });

          // Add driver_name and active status to trucks
          trucks = trucks.map((truck) => ({
            ...truck,
            driver_name: driverMap.get(truck.id) || undefined,
            active: activeMap.get(truck.id) ?? false, // Default to false if no driver assigned
          }));
        }
      } catch (error) {
        console.error("Error fetching driver information:", error);
        // Continue without driver info if fetch fails
      }

      return {
        trucks,
        total,
        page,
        pageSize,
      };
    } catch (error: any) {
      console.error("getTrucksOverview error:", error);
      throw error;
    }
  },

  /**
   * Get active trucks overview with driver information
   * A truck is active if its status is 'active' and belongs to a carrier-type company
   * Driver information is obtained by left joining drivers table on default_truck_id
   * Shows ALL trucks from carrier companies, regardless of driver assignment
   */
  async getActiveTrucksOverview(
    params?: TrucksOverviewParams
  ): Promise<TrucksOverviewResponse> {
    const pageSize = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    try {
      // First, get all active trucks from carrier-type companies
      const { data, error, count } = await supabase
        .from("trucks")
        .select(
          `
      id,
      truck_id,
      carrier_id,
      status,
      created_at,
      updated_at,
      companies!inner(
        id,
        name,
        type
      )
    `,
          { count: "exact" }
        )
        .eq("status", "active")
        .eq("companies.type", "Carrier")
        .order("truck_id", { ascending: true })
        .range(fromIndex, toIndex);

      console.log("getActiveTrucksOverview data:", data);

      if (error) {
        console.error("getTrucksOverview Supabase error:", error);
        throw new Error(error.message || "Failed to load trucks");
      }

      // Now get driver information for these trucks
      // Find drivers where default_truck_id matches any of our truck IDs
      const truckIds = (data || []).map((truck: any) => truck.id);

      let driverMap = new Map<string, any>();

      if (truckIds.length > 0) {
        const { data: drivers, error: driversError } = await supabase
          .from("drivers")
          .select("id, name, email, status, default_truck_id")
          .in("default_truck_id", truckIds);

        if (!driversError && drivers) {
          drivers.forEach((driver: any) => {
            if (driver.default_truck_id) {
              driverMap.set(driver.default_truck_id, driver);
            }
          });
        }
      }

      // Transform the data to match expected format
      const trucks = (data || []).map((truck: any) => ({
        id: truck.id,
        truck_id: truck.truck_id,
        carrier_id: truck.carrier_id,
        status: truck.status,
        created_at: truck.created_at,
        updated_at: truck.updated_at,
        companies: truck.companies,
        active_driver: driverMap.get(truck.id) || null,
      }));

      const result: TrucksOverviewResponse = {
        trucks,
        total: count || 0,
        page,
        pageSize,
      };

      return result;
    } catch (error: any) {
      console.error("getTrucksOverview error:", error);
      throw error;
    }
  },
};
