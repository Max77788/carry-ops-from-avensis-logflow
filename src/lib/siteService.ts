import { supabase } from "./supabase";
import { PickupSite, DestinationSite } from "./types";

export const siteService = {
  /**
   * Get all pickup sites
   */
  async getPickupSites(): Promise<PickupSite[]> {
    try {
      const { data, error } = await supabase
        .from("pickup_sites")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching pickup sites:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getPickupSites:", error);
      return [];
    }
  },

  /**
   * Get all destination sites
   */
  async getDestinationSites(): Promise<DestinationSite[]> {
    try {
      const { data, error } = await supabase
        .from("destination_sites")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching destination sites:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getDestinationSites:", error);
      return [];
    }
  },

  /**
   * Get a single pickup site by ID
   */
  async getPickupSite(id: string): Promise<PickupSite | null> {
    try {
      const { data, error } = await supabase
        .from("pickup_sites")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching pickup site:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in getPickupSite:", error);
      return null;
    }
  },

  /**
   * Get a single destination site by ID
   */
  async getDestinationSite(id: string): Promise<DestinationSite | null> {
    try {
      const { data, error } = await supabase
        .from("destination_sites")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching destination site:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in getDestinationSite:", error);
      return null;
    }
  },
};

