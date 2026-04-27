// src/lib/driverService.ts
import { supabase } from "./supabase";

export type Driver = {
  id: string;
  name: string;
  email?: string;
  status?: "active" | "inactive" | string;
  closed_tickets_today?: number;
};

export type DriversOverviewParams = {
  limit?: number;
  page?: number;
};

export type DriversOverviewResponse = {
  drivers: Driver[];
  total: number;
  page: number;
  pageSize: number;
};

export const driverService = {
  async getDriversOverview(
    params?: DriversOverviewParams
  ): Promise<DriversOverviewResponse> {
    const pageSize = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    try {
      // Select only necessary fields for faster query
      // Try with closed_tickets_today first, fall back to basic fields if it doesn't exist
      let query = supabase
        .from("drivers")
        .select("id, name, email, status", { count: "exact" })
        .order("name", { ascending: true })
        .range(fromIndex, toIndex);

      const { data, error, count } = await query;

      if (error) {
        console.error("getDriversOverview Supabase error:", error);
        throw new Error(error.message || "Failed to load drivers");
      }

      // Ensure all drivers have the closed_tickets_today field (default to 0)
      const drivers = (data ?? []).map((d: any) => ({
        ...d,
        closed_tickets_today: d.closed_tickets_today ?? 0,
      })) as Driver[];

      const total = count ?? drivers.length;

      console.log(
        `Loaded ${drivers.length} drivers (page ${page}, total: ${total})`
      );

      console.log("Drivers:", drivers);

      return {
        drivers,
        total,
        page,
        pageSize,
      };
    } catch (error: any) {
      console.error("getDriversOverview error:", error);
      throw error;
    }
  },
};
