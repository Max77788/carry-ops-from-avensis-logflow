import { supabase } from "./supabase";
import type { Ticket, AuditLog } from "./types";

export const ticketService = {
  async uploadTicketImage(
    ticketId: string,
    file: File
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      console.log(
        "Starting image upload for ticket:",
        ticketId,
        "File:",
        file.name,
        "Size:",
        file.size
      );

      // Create a unique filename
      const timestamp = Date.now();
      const filename = `${ticketId}-${timestamp}-${file.name}`;
      const filepath = `ticket-images/${filename}`;

      console.log("Upload path:", filepath);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("ticket-images")
        .upload(filepath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      console.log("Upload successful, data:", data);

      // Get public URL
      const { data: publicData } = supabase.storage
        .from("ticket-images")
        .getPublicUrl(filepath);

      console.log("Public URL:", publicData.publicUrl);

      return { success: true, url: publicData.publicUrl };
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      console.error("Error uploading ticket image:", error);
      console.error("Error message:", errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  async createTicket(
    ticket: Ticket,
    imageFile?: File
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify Supabase connection
      if (!supabase) {
        throw new Error(
          "Supabase client not initialized. Check your environment variables."
        );
      }

      // Upload image if provided
      let imageUrl: string | null = null;
      if (imageFile) {
        const uploadResult = await this.uploadTicketImage(
          ticket.ticket_id,
          imageFile
        );
        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url;
        } else {
          console.warn("Failed to upload image:", uploadResult.error);
        }
      }

      // Insert ticket with foreign keys (truck_id, driver_id, origin_site_id, destination_site_id)
      // Carrier is fetched via truck_id -> trucks.carrier_id -> carriers.name
      // Driver name is fetched via driver_id -> drivers.name
      // Origin site name is fetched via origin_site_id -> pickup_sites.name
      // Destination site name is fetched via destination_site_id -> destination_sites.name
      const { error } = await supabase.from("tickets").insert({
        ticket_id: ticket.ticket_id,
        truck_qr_id: ticket.truck_qr_id,
        truck_id: ticket.truck_id,
        // product: ticket.product,
        origin_site: ticket.origin_site, // Keep text field for backward compatibility
        destination_site: ticket.destination_site, // Keep text field for backward compatibility
        origin_site_id: ticket.origin_site_id || null, // Foreign key to pickup_sites
        destination_site_id: ticket.destination_site_id || null, // Foreign key to destination_sites
        gross_weight: ticket.gross_weight || null,
        tare_weight: ticket.tare_weight || null,
        net_weight: ticket.net_weight || null,
        scale_operator_signature: ticket.scale_operator_signature || null,
        destination_signature: ticket.destination_signature || null,
        status: ticket.status,
        created_at: ticket.created_at,
        // verified_at_scale: ticket.verified_at_scale || null,
        delivered_at: ticket.delivered_at || null,
        // load_gps: ticket.load_gps || null,
        delivery_gps: ticket.delivery_gps || null,
        // pdf_url: ticket.pdf_url || null,
        // customer_email: ticket.customer_email || null,
        // scale_ticket_file_url: ticket.scale_ticket_file_url || null,
        // include_scale_ticket_in_email: ticket.include_scale_ticket_in_email || false,
        confirmer_name: ticket.confirmer_name || null,
        // transaction_id: ticket.transaction_id || null, // Optional ticket ID
        // Removed denormalized fields - use FKs instead:
        // carrier: ticket.carrier || null,
        // driver_name: ticket.driver_name || null,
        // carrier_id: ticket.carrier_id || null,
        manual_ticket_id: ticket.manual_ticket_id || null, // Optional ticket ID
        driver_id: ticket.driver_id || null,
        ticket_image_url: imageUrl,
      });

      if (error) throw error;

      await this.logAction(ticket.ticket_id, "CREATED", "System", {
        truck_id: ticket.truck_id,
        product: ticket.product,
        has_image: !!imageUrl,
      });

      return { success: true };
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      console.error("Error creating ticket:", error);
      console.error("Formatted error:", errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      // Join with trucks, carriers, drivers, pickup sites, and destination sites to get related data
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          truck:trucks!tickets_truck_id_fkey (
            id,
            truck_id,
            carrier:companies (
              id,
              name
            )
          ),
          driver:drivers (
            id,
            name,
            driver_qr_code
          ),
          pickup_site:pickup_sites!tickets_origin_site_id_fkey (
            id,
            name,
            address
          ),
          destination_site_data:destination_sites!tickets_destination_site_id_fkey (
            id,
            name,
            location,
            address
          )
        `
        )
        .eq("ticket_id", ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Map the ticket data with joined data
      const ticket = this.mapDbTicketToTicket(data as any);

      return ticket;
    } catch (error) {
      console.error("Error getting ticket:", error);
      return null;
    }
  },

  async getAllTickets({
    sourceTableName = "tickets",
  }: {
    sourceTableName?: string;
  }): Promise<Ticket[]> {
    console.log("getAllTickets called with sourceTableName:", sourceTableName);

    try {
      // Join with trucks, carriers, drivers, pickup sites, and destination sites to get related data
      const { data, error } = await supabase
        .from(sourceTableName)
        .select(
          `
          *,
          truck:trucks (
            id,
            truck_id,
            carrier:companies (
              id,
              name
            )
          ),
          driver:drivers (
            id,
            name,
            driver_qr_code
          ),
          pickup_site:pickup_sites (
            id,
            name,
            address
          ),
          destination_site_data:destination_sites (
            id,
            name,
            location,
            address
          )
        `
        )
        .order("created_at", { ascending: false });

      console.log("getAllTickets - fetched data:", data?.length, "tickets");

      if (error) throw error;

      // Map tickets with joined data
      const tickets = (data || []).map((item: any) => {
        const ticket = this.mapDbTicketToTicket(item);
        return ticket;
      });

      console.log("getAllTickets - fetched data:", tickets.length, "tickets");

      return tickets;
    } catch (error) {
      console.error("Error getting all tickets:", error);
      return [];
    }
  },

  async getActiveTicketsByDriver(driverId: string): Promise<Ticket[]> {
    try {
      // Join with trucks, carriers, and drivers to get related data
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          truck:trucks!tickets_truck_id_fkey (
            id,
            truck_id,
            carrier:companies (
              id,
              name
            )
          ),
          driver:drivers (
            id,
            name,
            driver_qr_code
          )
        `
        )
        .eq("driver_id", driverId)
        .in("status", ["CREATED", "VERIFIED"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tickets = (data || []).map((item: any) => {
        const ticket = this.mapDbTicketToTicket(item);
        return ticket;
      });

      return tickets;
    } catch (error) {
      console.error("Error getting active tickets for driver:", error);
      return [];
    }
  },

  async getActiveTicketsByTruck(truckUuid: string): Promise<Ticket[]> {
    try {
      // Join with trucks, carriers, and drivers to get related data
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          truck:trucks!tickets_truck_id_fkey (
            id,
            truck_id,
            carrier:companies (
              id,
              name
            )
          ),
          driver:drivers (
            id,
            name,
            driver_qr_code
          )
        `
        )
        .eq("truck_id", truckUuid)
        .in("status", ["CREATED", "VERIFIED"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tickets = (data || []).map((item: any) => {
        const ticket = this.mapDbTicketToTicket(item);
        return ticket;
      });

      return tickets;
    } catch (error) {
      console.error("Error getting active tickets for truck:", error);
      return [];
    }
  },

  async getTicketsByDriver(driverId: string): Promise<Ticket[]> {
    try {
      // Join with trucks, carriers, and drivers to get related data
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          truck:trucks!tickets_truck_id_fkey (
            id,
            truck_id,
            carrier:companies (
              id,
              name
            )
          ),
          driver:drivers (
            id,
            name,
            driver_qr_code
          )
        `
        )
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tickets = (data || []).map((item: any) => {
        const ticket = this.mapDbTicketToTicket(item);
        return ticket;
      });

      return tickets;
    } catch (error) {
      console.error("Error getting tickets for driver:", error);
      return [];
    }
  },

  async updateTicket(
    ticketId: string,
    updates: Partial<Ticket>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // If status is being updated, validate the transition
      if (updates.status !== undefined) {
        const currentTicket = await this.getTicket(ticketId);
        if (!currentTicket) {
          return { success: false, error: "Ticket not found" };
        }

        // Validate status transition
        if (
          !this.isValidStatusTransition(currentTicket.status, updates.status)
        ) {
          return {
            success: false,
            error: `Invalid status transition from ${currentTicket.status} to ${updates.status}`,
          };
        }
      }

      const updateData: Record<string, unknown> = {};

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.destination_signature !== undefined)
        updateData.destination_signature = updates.destination_signature;
      if (updates.delivered_at !== undefined)
        updateData.delivered_at = updates.delivered_at;
      if (updates.delivery_gps !== undefined)
        updateData.delivery_gps = updates.delivery_gps;
      if (updates.pdf_url !== undefined) updateData.pdf_url = updates.pdf_url;
      if (updates.confirmer_name !== undefined)
        updateData.confirmer_name = updates.confirmer_name;
      if (updates.carrier !== undefined) updateData.carrier = updates.carrier;
      if (updates.driver_name !== undefined)
        updateData.driver_name = updates.driver_name;
      if (updates.ticket_image_url !== undefined)
        updateData.ticket_image_url = updates.ticket_image_url;

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("ticket_id", ticketId);

      if (error) throw error;

      if (updates.status) {
        await this.logAction(
          ticketId,
          `STATUS_CHANGED_TO_${updates.status}`,
          "System",
          {
            new_status: updates.status,
          }
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating ticket:", error);
      return { success: false, error: String(error) };
    }
  },

  async logAction(
    ticketId: string,
    action: string,
    actor: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase.from("audit_logs").insert({
        ticket_id: ticketId,
        action,
        actor,
        metadata_json: metadata || null,
      });
    } catch (error) {
      console.error("Error logging action:", error);
    }
  },

  async getAuditLogs(ticketId: string): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("timestamp_utc", { ascending: false });

      if (error) throw error;

      return (data || []).map((log) => ({
        ticket_id: log.ticket_id,
        action: log.action,
        actor: log.actor,
        timestamp_utc: log.timestamp_utc || new Date().toISOString(),
        metadata_json: log.metadata_json
          ? JSON.stringify(log.metadata_json)
          : undefined,
      }));
    } catch (error) {
      console.error("Error getting audit logs:", error);
      return [];
    }
  },

  mapDbTicketToTicket(dbTicket: any): Ticket {
    // Extract carrier name from joined truck -> carrier data
    // Path: dbTicket.truck.carrier.name
    let carrierValue: string | undefined;
    let carrierIdValue: string | undefined;
    let truckNameValue: string | undefined;

    console.log("Mapping DB ticket to ticket:", dbTicket);

    if (dbTicket.truck?.carrier) {
      // New structure: truck join with carrier
      carrierValue = dbTicket.truck.carrier.name;
      carrierIdValue = dbTicket.truck.carrier.id;
    } else if (typeof dbTicket.carrier === "string") {
      // Old structure: carrier as string (denormalized)
      carrierValue = dbTicket.carrier;
    } else if (
      dbTicket.carrier &&
      typeof dbTicket.carrier === "object" &&
      "name" in dbTicket.carrier
    ) {
      // Old structure: carrier as object from direct join
      carrierValue = dbTicket.carrier.name;
    }

    // Extract driver name and QR code from joined driver data
    let driverNameValue: string | undefined;
    let driverQrCodeValue: string | undefined;

    if (dbTicket.driver) {
      // New structure: driver join
      driverNameValue = dbTicket.driver.name;
      driverQrCodeValue = dbTicket.driver.driver_qr_code;
    } else if (typeof dbTicket.driver_name === "string") {
      // Old structure: driver_name as string (denormalized)
      driverNameValue = dbTicket.driver_name;
    }

    return {
      ticket_id: dbTicket.ticket_id,
      truck_qr_id: dbTicket.truck_qr_id,
      truck_id: dbTicket.truck_id,
      product: dbTicket.product,
      origin_site: dbTicket.origin_site,
      destination_site: dbTicket.destination_site,
      gross_weight: dbTicket.gross_weight,
      tare_weight: dbTicket.tare_weight,
      net_weight: dbTicket.net_weight,
      scale_operator_signature: dbTicket.scale_operator_signature,
      destination_signature: dbTicket.destination_signature,
      status: dbTicket.status,
      created_at: dbTicket.created_at,
      verified_at_scale: dbTicket.verified_at_scale,
      delivered_at: dbTicket.delivered_at,
      load_gps: dbTicket.load_gps,
      delivery_gps: dbTicket.delivery_gps,
      pdf_url: dbTicket.pdf_url,
      customer_email: dbTicket.customer_email,
      scale_ticket_file_url: dbTicket.scale_ticket_file_url,
      include_scale_ticket_in_email: dbTicket.include_scale_ticket_in_email,
      confirmer_name: dbTicket.confirmer_name,
      carrier: carrierValue,
      driver_name: driverNameValue,
      driver_id: dbTicket.driver_id,
      carrier_id: carrierIdValue || dbTicket.carrier_id,
      driver_qr_code: driverQrCodeValue,
      ticket_image_url: dbTicket.ticket_image_url,
      transaction_id: dbTicket.transaction_id,
      truck_name: dbTicket.truck.truck_id,
    };
  },

  async getDestinationSites(): Promise<
    Array<{ id: string; name: string; location?: string; description?: string }>
  > {
    try {
      const { data, error } = await supabase
        .from("destination_sites")
        .select("id, name, location, description")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Error fetching destination sites:", error);
      // Return empty array on error, will fall back to hardcoded sites
      return [];
    }
  },

  getErrorMessage(error: any): string {
    // Handle fetch errors (network issues, CORS, browser extensions)
    if (error?.message?.includes("Failed to fetch")) {
      return "Network error: Unable to connect to the server. Please check:\n1. Your internet connection\n2. Disable browser extensions (especially ad blockers)\n3. Check if Supabase is accessible";
    }

    // Handle Supabase-specific errors
    if (error?.message) {
      return error.message;
    }

    if (error?.details) {
      return error.details;
    }

    if (error?.hint) {
      return error.hint;
    }

    // Fallback
    return "An unexpected error occurred. Please try again.";
  },

  isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      CREATED: ["VERIFIED"],
      VERIFIED: ["CLOSED"],
      CLOSED: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  },

  // Add this inside `export const ticketService = { ... }`

  async getTicketsOverview(
    params?: {
      limit?: number;
      fromDate?: string; // "YYYY-MM-DD"
      page?: number;
    },
    sourceTableName: string = "tickets"
  ): Promise<{
    tickets: Ticket[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const pageSize = params?.limit ?? 50;
    const page = params?.page ?? 1;
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;
    const fromDate = params?.fromDate;

    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    // Join with trucks, carriers, drivers, pickup sites, and destination sites to get related data
    let query = supabase
      .from(sourceTableName)
      .select(
        `
      *,
      truck:trucks!${sourceTableName}_truck_id_fkey (
        id,
        truck_id,
        carrier:companies (
          id,
          name
        )
      ),
      driver:drivers (
        id,
        name,
        driver_qr_code
      ),
      pickup_site:pickup_sites!${sourceTableName}_origin_site_id_fkey (
        id,
        name,
        address
      ),
      destination_site_data:destination_sites!${sourceTableName}_destination_site_id_fkey (
        id,
        name,
        location,
        address
      )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(3000);

    if (fromDate) {
      // fromDate is "YYYY-MM-DD" – interpret as local day start
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      query = query.gte("created_at", start.toISOString());
    }

    const { data, error, count } = await query.range(fromIndex, toIndex);

    console.log("getTicketsOverview data:", data);

    if (error) {
      console.error("getTicketsOverview Supabase error:", error);
      throw new Error(error.message || "Failed to load tickets");
    }

    const rows = (data ?? []) as any[];

    const tickets: Ticket[] = rows.map((row) =>
      // reuse your existing mapper
      (ticketService as any).mapDbTicketToTicket
        ? (ticketService as any).mapDbTicketToTicket(row)
        : (row as Ticket)
    );

    return {
      tickets,
      total: count ?? tickets.length,
      page,
      pageSize,
    };
  },
};
