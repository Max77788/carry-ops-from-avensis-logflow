import { supabase } from "./supabase";
import { sendEmail } from "./emailService";
import { normalizePhoneToE164 } from "./validationUtils";

export interface InspectionItem {
  id: string;
  item_name: string;
  item_key: string;
  display_order: number;
  description?: string;
  category?: string;
  section?: string; // Section name for grouping
  section_order?: number; // Order of section
  item_order_in_section?: number; // Order within section
  risk_level?: number; // 1 = critical DOT shut-down, 2 = full walk-around
  location_order?: number; // Order for location-based flow (front to back)
  risk_order?: number; // Order for risk-first flow
}

export interface InspectionGroup {
  name: string;
  order: number;
  items: Array<InspectionItem & { status?: InspectionItemStatus }>;
}

export interface InspectionSection {
  name: string;
  order: number;
  items: Array<InspectionItem & { status?: InspectionItemStatus }>;
  groups?: InspectionGroup[];
}

export interface InspectionItemStatus {
  id: string;
  item_id: string;
  status: "working" | "not_working";
  notes?: string;
  image_urls?: string[];
  checked_at: string;
}

export interface DailyInspection {
  id: string;
  truck_id: string;
  driver_id?: string;
  inspection_date: string;
  items?: Array<InspectionItem & { status?: InspectionItemStatus }>;
}

export const truckInspectionService = {
  /**
   * Get or create today's inspection for a truck
   * If no inspection exists for today, creates a new one with all items set to "working"
   */
  async getOrCreateTodayInspection(
    truckId: string,
    driverId?: string
  ): Promise<{ success: boolean; data?: DailyInspection; error?: string }> {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Check if inspection exists for today
      const { data: existingInspection, error: fetchError } = await supabase
        .from("truck_daily_inspections")
        .select("*")
        .eq("truck_id", truckId)
        .eq("inspection_date", today)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingInspection) {
        // Load the inspection with items and their statuses
        return await this.getInspectionWithItems(existingInspection.id);
      }

      // Create new inspection for today
      const { data: newInspection, error: createError } = await supabase
        .from("truck_daily_inspections")
        .insert({
          truck_id: truckId,
          driver_id: driverId || null,
          inspection_date: today,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get all inspection items
      const { data: items, error: itemsError } = await supabase
        .from("truck_inspection_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (itemsError) throw itemsError;

      // Create default "working" status for all items
      if (items && items.length > 0) {
        const statusInserts = items.map((item) => ({
          inspection_id: newInspection.id,
          item_id: item.id,
          status: "working" as const,
        }));

        const { error: statusError } = await supabase
          .from("truck_inspection_item_status")
          .insert(statusInserts);

        if (statusError) throw statusError;
      }

      // Return the full inspection with items
      return await this.getInspectionWithItems(newInspection.id);
    } catch (error: any) {
      console.error("Error getting or creating inspection:", error);
      return { success: false, error: error.message || "Failed to get inspection" };
    }
  },

  /**
   * Get inspection with all items and their statuses
   */
  async getInspectionWithItems(
    inspectionId: string
  ): Promise<{ success: boolean; data?: DailyInspection; error?: string }> {
    try {
      // Get inspection
      const { data: inspection, error: inspectionError } = await supabase
        .from("truck_daily_inspections")
        .select("*")
        .eq("id", inspectionId)
        .single();

      if (inspectionError) throw inspectionError;

      // Get all items with their statuses for this inspection
      const { data: itemsWithStatus, error: itemsError } = await supabase
        .from("truck_inspection_item_status")
        .select(
          `
          *,
          item:truck_inspection_items(*)
        `
        )
        .eq("inspection_id", inspectionId);

      if (itemsError) throw itemsError;

      // Get all items to ensure we have everything (in case some weren't initialized)
      const { data: allItems, error: allItemsError } = await supabase
        .from("truck_inspection_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (allItemsError) throw allItemsError;

      // Map items with their statuses
      const statusMap = new Map(
        (itemsWithStatus || []).map((itemStatus: any) => [
          itemStatus.item_id,
          {
            id: itemStatus.id,
            item_id: itemStatus.item_id,
            status: itemStatus.status,
            notes: itemStatus.notes,
            image_urls: itemStatus.image_urls || [],
            checked_at: itemStatus.checked_at,
          },
        ])
      );

      const items = (allItems || []).map((item) => ({
        ...item,
        status: statusMap.get(item.id),
      }));

      return {
        success: true,
        data: {
          ...inspection,
          items: items as any,
        },
      };
    } catch (error: any) {
      console.error("Error getting inspection with items:", error);
      return { success: false, error: error.message || "Failed to get inspection" };
    }
  },

  /**
   * Update the status of an inspection item
   */
  async updateItemStatus(
    inspectionId: string,
    itemId: string,
    status: "working" | "not_working",
    notes?: string,
    imageUrls?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get existing status to check if this is a new issue (transition from working to not_working)
      const { data: existing } = await supabase
        .from("truck_inspection_item_status")
        .select("status, image_urls")
        .eq("inspection_id", inspectionId)
        .eq("item_id", itemId)
        .single();

      const previousStatus = existing?.status;
      const isNewIssue = status === "not_working" && previousStatus !== "not_working";

      // If imageUrls is provided, use it directly (replace, don't merge)
      // This allows for both adding new images and removing existing ones
      const finalImageUrls = imageUrls !== undefined 
        ? (imageUrls.length > 0 ? imageUrls : null)
        : undefined;

      // If imageUrls is undefined, we need to preserve existing images
      // Otherwise, replace with the new array
      let imageUrlsToSave = finalImageUrls;
      
      if (finalImageUrls === undefined) {
        imageUrlsToSave = existing?.image_urls || null;
      }

      const { error } = await supabase
        .from("truck_inspection_item_status")
        .upsert(
          {
            inspection_id: inspectionId,
            item_id: itemId,
            status,
            notes: notes !== undefined ? (notes || null) : undefined,
            image_urls: imageUrlsToSave,
            checked_at: new Date().toISOString(),
          },
          {
            onConflict: "inspection_id,item_id",
          }
        );

      if (error) throw error;

      // Update truck compliance status if an issue is reported
      if (status === "not_working") {
        await this.updateTruckComplianceStatus(inspectionId);
        // Note: Admin email notification is now sent when inspection is completed (all issues combined)
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error updating item status:", error);
      return { success: false, error: error.message || "Failed to update item status" };
    }
  },

  /**
   * Update truck compliance status based on inspection results
   */
  async updateTruckComplianceStatus(
    inspectionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the inspection to find the truck_id
      const { data: inspection, error: inspectionError } = await supabase
        .from("truck_daily_inspections")
        .select("truck_id, inspection_date")
        .eq("id", inspectionId)
        .single();

      if (inspectionError) throw inspectionError;

      // Count the number of "not_working" items
      const { count: issuesCount, error: countError } = await supabase
        .from("truck_inspection_item_status")
        .select("*", { count: "exact", head: true })
        .eq("inspection_id", inspectionId)
        .eq("status", "not_working");

      if (countError) throw countError;

      // Determine compliance status
      const compliance_status = (issuesCount && issuesCount > 0) ? "restricted" : "active";
      const last_inspection_status = (issuesCount && issuesCount > 0) ? "issues_reported" : "passed";

      // Update the truck
      const { error: updateError } = await supabase
        .from("trucks")
        .update({
          compliance_status,
          last_inspection_date: inspection.inspection_date,
          last_inspection_status,
        })
        .eq("id", inspection.truck_id);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error: any) {
      console.error("Error updating truck compliance:", error);
      return { success: false, error: error.message || "Failed to update truck compliance" };
    }
  },

  /**
   * Notify admin when an inspection issue is raised
   */
  async notifyAdminOfInspectionIssue(
    inspectionId: string,
    itemId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get inspection details
      const { data: inspection, error: inspectionError } = await supabase
        .from("truck_daily_inspections")
        .select(`
          id,
          truck_id,
          inspection_date,
          driver_id,
          truck:trucks!truck_daily_inspections_truck_id_fkey(
            truck_id,
            license_plate,
            carrier:companies!trucks_carrier_id_fkey_companies(name)
          ),
          driver:drivers(id, name, phone, email)
        `)
        .eq("id", inspectionId)
        .single();

      if (inspectionError) throw inspectionError;

      // Get the item that has the issue
      const { data: itemStatus, error: itemError } = await supabase
        .from("truck_inspection_item_status")
        .select(`
          notes,
          item:truck_inspection_items(item_name)
        `)
        .eq("inspection_id", inspectionId)
        .eq("item_id", itemId)
        .single();

      if (itemError) throw itemError;

      const truck = (inspection as any).truck;
      const driver = (inspection as any).driver;
      const itemName = itemStatus?.item?.item_name || "Unknown Item";

      // Get admin email from environment or use default
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "admin@avensis-logflow.com";

      // Generate email HTML
      const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inspection Issue Reported</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #ef4444; margin-bottom: 20px; font-size: 24px;">⚠️ Inspection Issue Reported</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">
      An inspection issue has been reported for a truck in the fleet.
    </p>

    <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444;">
      <h2 style="color: #ef4444; margin-top: 0; font-size: 18px; margin-bottom: 15px;">Issue Details</h2>
      
      <p style="margin: 10px 0; font-size: 16px;">
        <strong>Truck ID:</strong> ${truck?.truck_id || "N/A"}<br>
        <strong>License Plate:</strong> ${truck?.license_plate || "N/A"}<br>
        <strong>Carrier:</strong> ${truck?.carrier?.name || "N/A"}<br>
        <strong>Driver:</strong> ${driver?.name || "N/A"}<br>
        <strong>Inspection Date:</strong> ${new Date(inspection.inspection_date).toLocaleDateString()}<br>
        <strong>Issue Item:</strong> ${itemName}<br>
        <strong>Notes:</strong> ${itemStatus?.notes || "No notes provided"}
      </p>
    </div>

    <p style="font-size: 16px; margin-top: 25px;">
      Please review this issue in the Fleet Compliance tab of the Admin Dashboard.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Best regards,<br>
      <strong>Avensis LogFlow System</strong>
    </p>
  </div>
</body>
</html>
      `;

      // Send email
      const emailResult = await sendEmail({
        to: adminEmail,
        subject: `Inspection Issue Reported - Truck ${truck?.truck_id || "Unknown"}`,
        html: emailHTML,
      });

      if (!emailResult.success) {
        console.error("Failed to send admin notification email:", emailResult.error);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error notifying admin of inspection issue:", error);
      return { success: false, error: error.message || "Failed to notify admin" };
    }
  },

  /**
   * Notify admin of all inspection issues when inspection is completed
   */
  async notifyAdminOfAllInspectionIssues(
    inspectionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("📧 [ADMIN NOTIFICATION] Collecting all issues for inspection:", inspectionId);
      
      // Get inspection details
      const { data: inspection, error: inspectionError } = await supabase
        .from("truck_daily_inspections")
        .select(`
          id,
          truck_id,
          inspection_date,
          driver_id,
          truck:trucks!truck_daily_inspections_truck_id_fkey(
            truck_id,
            license_plate,
            carrier:companies!trucks_carrier_id_fkey_companies(name)
          ),
          driver:drivers(id, name, phone, email)
        `)
        .eq("id", inspectionId)
        .single();

      if (inspectionError) throw inspectionError;

      // Get all "not_working" items
      const { data: itemStatuses, error: itemsError } = await supabase
        .from("truck_inspection_item_status")
        .select(`
          notes,
          checked_at,
          item:truck_inspection_items(item_name)
        `)
        .eq("inspection_id", inspectionId)
        .eq("status", "not_working");

      if (itemsError) throw itemsError;

      // If no issues, don't send email
      if (!itemStatuses || itemStatuses.length === 0) {
        console.log("📧 [ADMIN NOTIFICATION] No issues found, skipping email");
        return { success: true };
      }

      const truck = (inspection as any).truck;
      const driver = (inspection as any).driver;

      // Get admin email from environment or use default
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "admin@avensis-logflow.com";

      // Generate issues list HTML
      const issuesListHTML = itemStatuses.map((itemStatus: any, index: number) => {
        const itemName = itemStatus?.item?.item_name || "Unknown Item";
        const notes = itemStatus?.notes || "No notes provided";
        const checkedAt = itemStatus?.checked_at 
          ? new Date(itemStatus.checked_at).toLocaleString() 
          : "N/A";
        
        return `
          <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #ef4444;">
            <h3 style="color: #ef4444; margin-top: 0; margin-bottom: 10px; font-size: 16px;">
              Issue ${index + 1}: ${itemName}
            </h3>
            <p style="margin: 5px 0; font-size: 14px;">
              <strong>Notes:</strong> ${notes}
            </p>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">
              <strong>Reported at:</strong> ${checkedAt}
            </p>
          </div>
        `;
      }).join("");

      // Generate email HTML
      const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inspection Issues Reported</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #ef4444; margin-bottom: 20px; font-size: 24px;">⚠️ Inspection Issues Reported</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">
      An inspection has been completed with ${itemStatuses.length} issue${itemStatuses.length > 1 ? 's' : ''} reported for a truck in the fleet.
    </p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h2 style="color: #1f2937; margin-top: 0; font-size: 18px; margin-bottom: 15px;">Inspection Details</h2>
      
      <p style="margin: 10px 0; font-size: 16px;">
        <strong>Truck ID:</strong> ${truck?.truck_id || "N/A"}<br>
        <strong>License Plate:</strong> ${truck?.license_plate || "N/A"}<br>
        <strong>Carrier:</strong> ${truck?.carrier?.name || "N/A"}<br>
        <strong>Driver:</strong> ${driver?.name || "N/A"}<br>
        <strong>Inspection Date:</strong> ${new Date(inspection.inspection_date).toLocaleDateString()}<br>
        <strong>Total Issues:</strong> ${itemStatuses.length}
      </p>
    </div>

    <div style="margin: 25px 0;">
      <h2 style="color: #ef4444; font-size: 18px; margin-bottom: 15px;">Issues Found</h2>
      ${issuesListHTML}
    </div>

    <p style="font-size: 16px; margin-top: 25px;">
      Please review these issues in the Fleet Compliance tab of the Admin Dashboard.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Best regards,<br>
      <strong>Avensis LogFlow System</strong>
    </p>
  </div>
</body>
</html>
      `;

      // Send email
      console.log(`📧 [ADMIN NOTIFICATION] Sending email to admin with ${itemStatuses.length} issue(s)`);
      const emailResult = await sendEmail({
        to: adminEmail,
        subject: `Inspection Issues Reported - Truck ${truck?.truck_id || "Unknown"} (${itemStatuses.length} issue${itemStatuses.length > 1 ? 's' : ''})`,
        html: emailHTML,
      });

      if (!emailResult.success) {
        console.error("❌ [ADMIN NOTIFICATION] Failed to send admin notification email:", emailResult.error);
        return { success: false, error: emailResult.error };
      }

      console.log("✅ [ADMIN NOTIFICATION] Admin notification email sent successfully");
      return { success: true };
    } catch (error: any) {
      console.error("❌ [ADMIN NOTIFICATION] Error sending admin notification:", error);
      return { success: false, error: error.message || "Failed to send admin notification" };
    }
  },

  /**
   * Generate and save inspection report, then send SMS to driver
   */
  async generateAndSaveInspectionReport(
    inspectionId: string
  ): Promise<{ success: boolean; reportUrl?: string; error?: string }> {
    console.log("📄 [REPORT GENERATION] Starting report generation for inspection:", inspectionId);
    try {
      // Get inspection with all details
      console.log("📄 [REPORT GENERATION] Step 1: Fetching inspection data...");
      const { data: inspection, error: inspectionError } = await supabase
        .from("truck_daily_inspections")
        .select(`
          id,
          truck_id,
          inspection_date,
          driver_id,
          truck:trucks!truck_daily_inspections_truck_id_fkey(
            truck_id,
            license_plate,
            license_state,
            vin,
            carrier:companies!trucks_carrier_id_fkey_companies(name)
          ),
          driver:drivers(id, name, phone, email)
        `)
        .eq("id", inspectionId)
        .single();

      if (inspectionError) {
        console.error("❌ [REPORT GENERATION] Error fetching inspection:", inspectionError);
        throw inspectionError;
      }
      console.log("✅ [REPORT GENERATION] Inspection data fetched:", {
        id: inspection?.id,
        truck_id: inspection?.truck_id,
        inspection_date: inspection?.inspection_date,
        driver_id: inspection?.driver_id,
      });

      // Get all inspection items with their statuses
      console.log("📄 [REPORT GENERATION] Step 2: Fetching inspection item statuses...");
      const { data: itemStatuses, error: itemsError } = await supabase
        .from("truck_inspection_item_status")
        .select(`
          status,
          notes,
          checked_at,
          item:truck_inspection_items(item_name, item_key)
        `)
        .eq("inspection_id", inspectionId);

      if (itemsError) {
        console.error("❌ [REPORT GENERATION] Error fetching item statuses:", itemsError);
        throw itemsError;
      }
      console.log(`✅ [REPORT GENERATION] Item statuses fetched: ${itemStatuses?.length || 0} items`);

      const truck = (inspection as any).truck;
      const driver = (inspection as any).driver;
      console.log("📄 [REPORT GENERATION] Truck info:", {
        truck_id: truck?.truck_id,
        license_plate: truck?.license_plate,
        carrier: truck?.carrier?.name,
      });
      console.log("📄 [REPORT GENERATION] Driver info:", {
        driver_id: driver?.id,
        name: driver?.name,
        has_phone: !!driver?.phone,
        has_email: !!driver?.email,
      });

      // Generate PDF report HTML
      console.log("📄 [REPORT GENERATION] Step 3: Generating HTML report...");
      const reportHTML = this.generateInspectionReportHTML({
        inspectionDate: inspection.inspection_date,
        truckId: truck?.truck_id || "N/A",
        licensePlate: truck?.license_plate || "N/A",
        licenseState: truck?.license_state || "N/A",
        vin: truck?.vin || "N/A",
        carrierName: truck?.carrier?.name || "N/A",
        driverName: driver?.name || "N/A",
        items: (itemStatuses || []).map((item: any) => ({
          name: item.item?.item_name || "Unknown",
          status: item.status,
          notes: item.notes || "",
          checkedAt: item.checked_at,
        })),
      });
      console.log(`✅ [REPORT GENERATION] HTML report generated: ${reportHTML.length} characters`);
      console.log("📄 [REPORT GENERATION] HTML preview (first 500 chars):", reportHTML.substring(0, 500));
      console.log("📄 [REPORT GENERATION] HTML contains DOCTYPE:", reportHTML.includes("<!DOCTYPE"));
      console.log("📄 [REPORT GENERATION] HTML contains page divs:", reportHTML.includes("div class=\"page\""));

      // Convert HTML to PDF
      console.log("📄 [REPORT GENERATION] Step 4: Converting HTML to PDF...");
      let pdfBytes: Uint8Array | null = null;
      try {
        pdfBytes = await this.convertHTMLToPDF(reportHTML, inspectionId);
        console.log(`✅ [REPORT GENERATION] PDF generated: ${pdfBytes.length} bytes`);
      } catch (pdfError: any) {
        console.error("❌ [REPORT GENERATION] PDF conversion failed, falling back to HTML:", pdfError);
        // Continue with HTML fallback
      }

      // Save report to Supabase Storage
      // Note: Bucket creation requires admin/service role, not client-side
      // The bucket should be created via Supabase dashboard or MCP
      console.log("📄 [REPORT GENERATION] Step 5: Preparing to upload report to storage...");
      
      const timestamp = Date.now();
      const baseFileName = `inspection-report-${inspectionId}-${timestamp}`;
      let reportUrl: string;
      
      // Upload PDF if conversion succeeded, otherwise upload HTML
      if (pdfBytes && pdfBytes.length > 0) {
        const pdfFileName = `${baseFileName}.pdf`;
        console.log("📄 [REPORT GENERATION] Uploading PDF file:", pdfFileName);
        const { data: pdfUploadData, error: pdfUploadError } = await supabase.storage
          .from("inspection-reports")
          .upload(pdfFileName, pdfBytes, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (pdfUploadError) {
          console.error("❌ [REPORT GENERATION] PDF upload failed:", pdfUploadError);
          
          // Check if error is due to missing bucket
          if (pdfUploadError.message?.includes("Bucket not found") || pdfUploadError.message?.includes("not found")) {
            console.error("❌ [REPORT GENERATION] Storage bucket 'inspection-reports' does not exist. Please create it via Supabase dashboard or MCP.");
            throw new Error("Storage bucket 'inspection-reports' does not exist. Please contact an administrator to create it.");
          }
          
          throw pdfUploadError;
        }
        
        console.log("✅ [REPORT GENERATION] PDF file uploaded successfully");

        // Get public URL for PDF
        console.log("📄 [REPORT GENERATION] Step 6: Getting public URL for PDF...");
        const { data: urlData } = supabase.storage
          .from("inspection-reports")
          .getPublicUrl(pdfFileName);

        reportUrl = urlData?.publicUrl;
      } else {
        // Fallback to HTML upload
        const htmlFileName = `${baseFileName}.html`;
        console.log("📄 [REPORT GENERATION] Uploading HTML file (PDF conversion failed):", htmlFileName);
        const { data: htmlUploadData, error: htmlUploadError } = await supabase.storage
          .from("inspection-reports")
          .upload(htmlFileName, new Blob([reportHTML], { type: "text/html" }), {
            contentType: "text/html",
            upsert: false,
          });

        if (htmlUploadError) {
          console.error("❌ [REPORT GENERATION] HTML upload failed:", htmlUploadError);
          
          // Check if error is due to missing bucket
          if (htmlUploadError.message?.includes("Bucket not found") || htmlUploadError.message?.includes("not found")) {
            console.error("❌ [REPORT GENERATION] Storage bucket 'inspection-reports' does not exist. Please create it via Supabase dashboard or MCP.");
            throw new Error("Storage bucket 'inspection-reports' does not exist. Please contact an administrator to create it.");
          }
          
          throw htmlUploadError;
        }
        
        console.log("✅ [REPORT GENERATION] HTML file uploaded successfully");

        // Get public URL for HTML
        console.log("📄 [REPORT GENERATION] Step 6: Getting public URL for HTML...");
        const { data: urlData } = supabase.storage
          .from("inspection-reports")
          .getPublicUrl(htmlFileName);

        reportUrl = urlData?.publicUrl;
      }

      // Always save report URL to the inspection record
      if (!reportUrl) {
        console.error("❌ [REPORT GENERATION] Failed to get public URL for inspection report");
        throw new Error("Failed to get public URL for inspection report");
      }
      console.log("✅ [REPORT GENERATION] Public URL obtained:", reportUrl);

      // Save report URL to database - always save it, not just if driver_id exists
      console.log("📄 [REPORT GENERATION] Step 7: Saving report URL to database...");
      try {
        const { error: dbError } = await supabase
          .from("truck_daily_inspections")
          .update({ report_url: reportUrl })
          .eq("id", inspectionId);
        
        if (dbError) {
          console.error("❌ [REPORT GENERATION] Error saving report URL to database:", dbError);
          throw new Error(`Failed to save report URL: ${dbError.message}`);
        }
        console.log("✅ [REPORT GENERATION] Report URL saved to database:", reportUrl);
      } catch (dbError: any) {
        console.error("❌ [REPORT GENERATION] Error saving report URL to database:", dbError);
        throw dbError; // Re-throw to fail the operation if we can't save the URL
      }

      // Send admin notification with all issues (if any)
      console.log("📄 [REPORT GENERATION] Step 8: Sending admin notification with all issues...");
      try {
        await this.notifyAdminOfAllInspectionIssues(inspectionId);
      } catch (adminNotifyError: any) {
        console.error("❌ [REPORT GENERATION] Error sending admin notification:", adminNotifyError);
        // Don't fail the operation if admin notification fails
      }

      // Send notification to driver - SMS if phone exists, otherwise email
      console.log("📄 [REPORT GENERATION] Step 9: Sending notification to driver...");
      if (reportUrl) {
        try {
          if (driver?.phone) {
            // Normalize phone number to E.164 format for SMS
            const normalizedPhone = normalizePhoneToE164(driver.phone);
            if (normalizedPhone) {
              console.log("📱 [REPORT GENERATION] Sending inspection report via SMS to:", normalizedPhone);
              await this.sendInspectionReportSMS(normalizedPhone, reportUrl);
              console.log("✅ [REPORT GENERATION] SMS notification sent successfully");
            } else {
              console.warn("⚠️ [REPORT GENERATION] Invalid phone number format, trying email instead:", driver.phone);
              // Fall back to email if phone is invalid
              if (driver?.email) {
                console.log("📧 [REPORT GENERATION] Sending inspection report via email to:", driver.email);
                await this.sendInspectionReportEmail(driver.email, driver.name || "Driver", reportUrl, {
                  inspectionDate: inspection.inspection_date,
                  truckId: truck?.truck_id || "N/A",
                  carrierName: truck?.carrier?.name || "N/A",
                });
                console.log("✅ [REPORT GENERATION] Email notification sent successfully");
              }
            }
          } else if (driver?.email) {
            // No phone number, send via email
            console.log("📧 [REPORT GENERATION] Sending inspection report via email to:", driver.email);
            await this.sendInspectionReportEmail(driver.email, driver.name || "Driver", reportUrl, {
              inspectionDate: inspection.inspection_date,
              truckId: truck?.truck_id || "N/A",
              carrierName: truck?.carrier?.name || "N/A",
            });
            console.log("✅ [REPORT GENERATION] Email notification sent successfully");
          } else {
            console.warn("⚠️ [REPORT GENERATION] Driver has no phone or email, cannot send inspection report notification");
          }
        } catch (notifyError) {
          console.error("❌ [REPORT GENERATION] Error sending inspection report notification:", notifyError);
          // Don't fail the whole operation if notification fails
        }
      }

      console.log("✅ [REPORT GENERATION] Report generation completed successfully:", reportUrl);
      return { success: true, reportUrl };
    } catch (error: any) {
      console.error("❌ [REPORT GENERATION] Report generation failed:", error);
      console.error("❌ [REPORT GENERATION] Error details:", {
        message: error.message,
        stack: error.stack,
        inspectionId,
      });
      return { success: false, error: error.message || "Failed to generate inspection report" };
    }
  },

  /**
   * Generate HTML for inspection report
   */
  generateInspectionReportHTML(params: {
    inspectionDate: string;
    truckId: string;
    licensePlate: string;
    licenseState: string;
    vin: string;
    carrierName: string;
    driverName: string;
    items: Array<{ name: string; status: string; notes: string; checkedAt: string }>;
  }): string {
    const issues = params.items.filter((item) => item.status === "not_working");
    const passed = params.items.filter((item) => item.status === "working");
    const allItems = [...issues, ...passed]; // Issues first, then passed items

    return `
<html>
<head>
  <meta http-equiv="content-type" content="text/html; charset=UTF-8" />
  <title>Daily Vehicle Inspection Report - ${params.truckId}</title>
  <style>
    div.page {
      page-break-after: always;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="page">
    <h1>Daily Vehicle Inspection Report</h1>
    
    <p><strong>Date:</strong> ${new Date(params.inspectionDate).toLocaleDateString()}</p>
    <p><strong>Truck ID:</strong> ${params.truckId}</p>
    <p><strong>License Plate:</strong> ${params.licensePlate} (${params.licenseState})</p>
    <p><strong>VIN:</strong> ${params.vin}</p>
    <p><strong>Carrier:</strong> ${params.carrierName}</p>
    <p><strong>Driver:</strong> ${params.driverName}</p>

    <h2>Inspection Summary</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>Item</th>
          <th>Status</th>
          <th>Notes</th>
          <th>Checked At</th>
        </tr>
      </thead>
      <tbody>
        ${allItems.map(item => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.status === "not_working" ? "NOT WORKING" : "WORKING"}</td>
            <td>${item.notes || "-"}</td>
            <td>${new Date(item.checkedAt).toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  ${issues.length > 0 ? `
  <div class="page">
    <h2>Issues Requiring Attention (${issues.length})</h2>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>Item</th>
          <th>Notes</th>
          <th>Reported At</th>
        </tr>
      </thead>
      <tbody>
        ${issues.map(item => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.notes || "No notes provided"}</td>
            <td>${new Date(item.checkedAt).toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="page">
    <p><strong>Driver Signature:</strong> ${params.driverName}</p>
    <p><strong>Inspection Date:</strong> ${new Date(params.inspectionDate).toLocaleDateString()}</p>
    <p><strong>Total Items Inspected:</strong> ${params.items.length}</p>
    <p><strong>Items Working:</strong> ${passed.length}</p>
    ${issues.length > 0 ? `<p><strong>Items Not Working:</strong> ${issues.length}</p>` : ""}
    <p>This report is valid for 24 hours from the inspection date. Keep this report available for DOT inspections.</p>
  </div>
</body>
</html>
    `;
  },

  /**
   * Convert HTML to PDF using pdfendpoint.com API
   * First uploads HTML to storage, then converts the URL to PDF
   */
  async convertHTMLToPDF(html: string, inspectionId: string): Promise<Uint8Array> {
    try {
      console.log("📄 [PDF CONVERSION] Converting HTML to PDF using pdfendpoint.com...");
      console.log("📄 [PDF CONVERSION] HTML length:", html.length);
      console.log("📄 [PDF CONVERSION] HTML preview (first 500 chars):", html.substring(0, 500));
      console.log("📄 [PDF CONVERSION] HTML contains DOCTYPE:", html.includes("<!DOCTYPE"));
      console.log("📄 [PDF CONVERSION] HTML contains page divs:", html.includes("div class=\"page\""));
      
      // First, upload HTML to storage temporarily to get a URL
      const tempFileName = `temp-html-${inspectionId}-${Date.now()}.html`;
      console.log("📄 [PDF CONVERSION] Uploading HTML to storage for conversion...");
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("inspection-reports")
        .upload(tempFileName, new Blob([html], { type: "text/html" }), {
          contentType: "text/html",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload HTML for PDF conversion: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("inspection-reports")
        .getPublicUrl(tempFileName);

      const htmlUrl = urlData?.publicUrl;
      if (!htmlUrl) {
        throw new Error("Failed to get public URL for HTML");
      }

      console.log("📄 [PDF CONVERSION] HTML URL obtained:", htmlUrl);
      console.log("📄 [PDF CONVERSION] Converting URL to PDF...");

      // Get API key from environment or use the provided one
      const apiKey = import.meta.env.VITE_PDFENDPOINT_API_KEY || "pdfe_live_7501b32442cddc17879d549fcea6af72da07";

      // Convert URL to PDF using pdfendpoint.com
      const requestBody = {
        url: htmlUrl,
        sandbox: false,
        orientation: "vertical",
        page_size: "A4",
        margin_top: "2cm",
        margin_bottom: "2cm",
        margin_left: "2cm",
        margin_right: "2cm",
      };
      
      console.log("📄 [PDF CONVERSION] API request body:", JSON.stringify(requestBody, null, 2));
      
      const response = await fetch("https://api.pdfendpoint.com/v1/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Clean up temp file
        await supabase.storage.from("inspection-reports").remove([tempFileName]);
        throw new Error(`PDF conversion failed: ${response.statusText} - ${errorText}`);
      }

      // pdfendpoint.com returns JSON with PDF URL
      const result = await response.json();
      
      if (!result.success || !result.data?.url) {
        // Clean up temp file
        await supabase.storage.from("inspection-reports").remove([tempFileName]);
        throw new Error(`PDF conversion failed: ${result.error || "No PDF URL returned"}`);
      }

      console.log("📄 [PDF CONVERSION] PDF generated successfully:", {
        url: result.data.url,
        file_size: result.data.file_size,
        page_count: result.data.page_count,
        expires_after: result.data.expires_after,
      });

      // Download PDF from the returned URL
      console.log("📄 [PDF CONVERSION] Downloading PDF from URL...");
      const pdfResponse = await fetch(result.data.url);
      
      if (!pdfResponse.ok) {
        // Clean up temp file
        await supabase.storage.from("inspection-reports").remove([tempFileName]);
        throw new Error(`Failed to download PDF: ${pdfResponse.statusText}`);
      }

      const pdfBlob = await pdfResponse.blob();
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Clean up temporary HTML file
      console.log("📄 [PDF CONVERSION] Cleaning up temporary HTML file...");
      await supabase.storage.from("inspection-reports").remove([tempFileName]).catch((err) => {
        console.warn("⚠️ [PDF CONVERSION] Failed to clean up temp file:", err);
      });

      console.log(`✅ [PDF CONVERSION] PDF generated: ${bytes.length} bytes`);
      return bytes;
    } catch (error: any) {
      console.error("❌ [PDF CONVERSION] Error converting HTML to PDF:", error);
      throw error;
    }
  },

  /**
   * Send SMS to driver with inspection report link
   */
  async sendInspectionReportSMS(
    phoneNumber: string,
    reportUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Call SMS API endpoint
      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: `Your daily inspection report is ready. View it here: ${reportUrl}. Keep this link for DOT inspections.`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send SMS");
      }

      console.log("✅ SMS sent successfully!");
      return { success: true };
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      return { success: false, error: error.message || "Failed to send SMS" };
    }
  },

  /**
   * Send email to driver with inspection report link
   */
  async sendInspectionReportEmail(
    email: string,
    driverName: string,
    reportUrl: string,
    details: {
      inspectionDate: string;
      truckId: string;
      carrierName: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const inspectionDateFormatted = new Date(details.inspectionDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily Inspection Report</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #10b981; margin-bottom: 10px; font-size: 24px;">✅ Daily Inspection Report</h1>
      <p style="color: #6b7280; font-size: 14px;">Your inspection has been completed and documented</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 15px;">
      Hi <strong>${driverName}</strong>,
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your daily vehicle inspection report is ready. Keep this link available for DOT inspections.
    </p>

    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 18px; margin-bottom: 15px;">Inspection Details</h2>
      
      <p style="margin: 8px 0; font-size: 15px;">
        <strong>Date:</strong> ${inspectionDateFormatted}<br>
        <strong>Truck ID:</strong> ${details.truckId}<br>
        <strong>Carrier:</strong> ${details.carrierName}
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${reportUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        📋 View Full Report
      </a>
    </div>

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⚠️ Important:</strong> This report is valid for 24 hours from the inspection date. 
        Save this email or bookmark the link for easy access during DOT stops.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${reportUrl}" style="color: #10b981; word-break: break-all;">${reportUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 14px; color: #9ca3af; text-align: center;">
      This is an automated message from Avensis LogFlow.<br>
      Please do not reply to this email.
    </p>
  </div>
</body>
</html>
      `;

      const result = await sendEmail({
        to: email,
        subject: `Daily Inspection Report - Truck ${details.truckId} - ${inspectionDateFormatted}`,
        html: emailHTML,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      console.log("✅ Email sent successfully!");
      return { success: true };
    } catch (error: any) {
      console.error("Error sending inspection report email:", error);
      return { success: false, error: error.message || "Failed to send email" };
    }
  },

  /**
   * Get inspection history for a driver or truck
   */
  async getInspectionHistory(
    driverId?: string,
    truckId?: string,
    limit: number = 30
  ): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      inspection_date: string;
      completed_at: string | null;
      report_url: string | null;
      truck_id: string;
      driver_id: string | null;
      truck?: { truck_id: string; license_plate: string | null };
    }>;
    error?: string;
  }> {
    try {
      let query = supabase
        .from("truck_daily_inspections")
        .select(`
          id,
          inspection_date,
          completed_at,
          report_url,
          truck_id,
          driver_id,
          truck:trucks!truck_daily_inspections_truck_id_fkey(
            truck_id,
            license_plate
          )
        `)
        .order("inspection_date", { ascending: false })
        .limit(limit);

      if (driverId) {
        query = query.eq("driver_id", driverId);
      }
      if (truckId) {
        query = query.eq("truck_id", truckId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: (data || []).map((inspection: any) => ({
          id: inspection.id,
          inspection_date: inspection.inspection_date,
          completed_at: inspection.completed_at,
          report_url: inspection.report_url,
          truck_id: inspection.truck_id,
          driver_id: inspection.driver_id,
          truck: inspection.truck
            ? {
                truck_id: inspection.truck.truck_id,
                license_plate: inspection.truck.license_plate,
              }
            : undefined,
        })),
      };
    } catch (error: any) {
      console.error("Error getting inspection history:", error);
      return {
        success: false,
        error: error.message || "Failed to get inspection history",
      };
    }
  },

  /**
   * Get all inspection items (for reference)
   */
  async getAllInspectionItems(): Promise<{
    success: boolean;
    data?: InspectionItem[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("truck_inspection_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error("Error getting inspection items:", error);
      return { success: false, error: error.message || "Failed to get inspection items" };
    }
  },

  /**
   * Group items by sections and groups for the given inspection mode
   * mode: 'critical-issue-first' | 'location-based'
   */
  groupItemsBySections(
    items: Array<InspectionItem & { status?: any }>,
    mode: 'critical-issue-first' | 'location-based'
  ): InspectionSection[] {
    // Define sections and groups for location-based mode (Option 1 - Standard Clockwise Walk-Around)
    const locationBasedStructure = [
      {
        name: 'Front / Engine Area',
        order: 1,
        groups: [
          { name: 'Front / Engine Area', order: 1, itemKeys: ['air_compressor', 'engine', 'radiator', 'oil_pressure', 'belts_hoses'] },
        ],
      },
      {
        name: 'Cab / Interior',
        order: 2,
        groups: [
          { name: 'Cab / Interior', order: 1, itemKeys: ['horn', 'mirrors', 'windshield', 'windshield_wipers', 'defroster', 'heater', 'on_board_recorder'] },
        ],
      },
      {
        name: 'Driver Side',
        order: 3,
        groups: [
          { name: 'Driver Side', order: 1, itemKeys: ['fuel_tanks', 'battery', 'drive_line', 'exhaust_muffler'] },
        ],
      },
      {
        name: 'Axles & Wheels',
        order: 4,
        groups: [
          { name: 'Axles & Wheels', order: 1, itemKeys: ['front_axle', 'rear_end', 'tires', 'wheels', 'springs'] },
        ],
      },
      {
        name: 'Brakes & Air',
        order: 5,
        groups: [
          { name: 'Brakes & Air', order: 1, itemKeys: ['brakes', 'brake_accessories', 'air_lines'] },
        ],
      },
      {
        name: 'Coupling Area',
        order: 6,
        groups: [
          { name: 'Coupling Area', order: 1, itemKeys: ['fifth_wheel'] },
        ],
      },
      {
        name: 'Lights & Visibility',
        order: 7,
        groups: [
          { name: 'Lights & Visibility', order: 1, itemKeys: ['headlights', 'tail_dash', 'turn_indicators', 'reflectors'] },
        ],
      },
      {
        name: 'Safety',
        order: 8,
        groups: [
          { name: 'Safety', order: 1, itemKeys: ['safety_equipment', 'fire_extinguisher', 'flags_flares_fuses', 'spare_bulbs_fuses'] },
        ],
      },
      {
        name: 'Trailer Section',
        order: 9,
        groups: [
          { name: 'Trailer Section', order: 1, itemKeys: ['brake_connection', 'trailer_brakes', 'coupling_king_pin', 'landing_gear', 'trailer_lights_all', 'trailer_tires', 'trailer_wheels', 'trailer_doors', 'trailer_roof', 'trailer_tarpaulin', 'trailer_springs'] },
        ],
      },
    ];

    // Define sections and groups for critical-issue-first mode (Option 2 - Risk-First Walk-Around)
    const criticalIssueFirstStructure = [
      {
        name: 'Phase 1 – Critical DOT Shut-Down Items',
        order: 1,
        groups: [
          { 
            name: 'Lights', 
            order: 1, 
            itemKeys: ['lights', 'head_stop', 'tail_dash', 'turn_indicators', 'reflectors', 'trailer_lights_all']
          },
          { 
            name: 'Tires & Wheels', 
            order: 2, 
            itemKeys: ['tires', 'wheels']
          },
          { 
            name: 'Brakes & Air', 
            order: 3, 
            itemKeys: ['brakes', 'brake_accessories', 'air_lines']
          },
          { 
            name: 'Leaks / Powertrain', 
            order: 4, 
            itemKeys: ['engine', 'oil_pressure', 'fuel_tanks', 'drive_line']
          },
          { 
            name: 'Coupling', 
            order: 5, 
            itemKeys: ['fifth_wheel', 'coupling_king_pin']
          },
        ],
      },
      {
        name: 'Phase 2 – Remaining DVIR Items',
        order: 2,
        groups: [
          { 
            name: 'Cab & Controls', 
            order: 1, 
            itemKeys: ['horn', 'mirrors', 'windshield', 'windshield_wipers', 'defroster', 'heater', 'on_board_recorder']
          },
          { 
            name: 'Mechanical', 
            order: 2, 
            itemKeys: ['air_compressor', 'battery', 'radiator', 'muffler', 'transmission', 'clutch', 'starter', 'steering']
          },
          { 
            name: 'Suspension & Structure', 
            order: 3, 
            itemKeys: ['front_axle', 'rear_end', 'springs', 'frame_roof']
          },
          { 
            name: 'Safety', 
            order: 4, 
            itemKeys: ['safety_equipment', 'fire_extinguisher', 'flags_flares_fuses', 'spare_bulbs_fuses']
          },
          { 
            name: 'Trailer', 
            order: 5, 
            itemKeys: ['brake_connection', 'landing_gear', 'trailer_doors', 'trailer_tarpaulin']
          },
        ],
      },
    ];

    const structure = mode === 'critical-issue-first' ? criticalIssueFirstStructure : locationBasedStructure;

    const groupedSections: InspectionSection[] = structure.map((sectionDef) => {
      const sectionGroups: InspectionGroup[] = sectionDef.groups.map((groupDef) => {
        const groupItems = groupDef.itemKeys
          .map((key) => items.find((item) => item.item_key === key))
          .filter((item): item is InspectionItem & { status?: any } => item !== undefined);

        return {
          name: groupDef.name,
          order: groupDef.order,
          items: groupItems,
        };
      }); // Remove filter to show all groups, even if empty

      // Flatten groups into items for backward compatibility
      const allSectionItems = sectionGroups.flatMap((group) => group.items);

      return {
        name: sectionDef.name,
        order: sectionDef.order,
        items: allSectionItems,
        groups: sectionGroups,
      };
    }); // Remove filter to show all sections, even if empty

    return groupedSections;
  },

  /**
   * Reorder items based on inspection flow type (legacy method, kept for backward compatibility)
   * flowType: 'critical-issue-first' | 'location-based'
   */
  reorderItemsByFlowType(
    items: Array<InspectionItem & { status?: any }>,
    flowType: 'critical-issue-first' | 'location-based'
  ): Array<InspectionItem & { status?: any }> {
    // Risk-first order mapping based on user specification
    const riskFirstOrder: Record<string, number> = {
      // Section 1 - Critical DOT Shut-Down Items
      'headlights_low_beam': 1,
      'headlights_high_beam': 2,
      'turn_signals': 3,
      'brake_lights': 4,
      'marker_clearance_lights': 5,
      'trailer_lights': 6,
      'tire_condition': 7,
      'tire_inflation': 8,
      'tread_depth': 9,
      'lug_nuts': 10,
      'rims': 11,
      'air_lines': 12,
      'brake_chambers': 13,
      'brake_damage': 14,
      'air_leaks': 15,
      'fuel_leaks': 16,
      'oil_leaks': 17,
      'coolant_leaks': 18,
      'air_leaks_visual': 19,
      'fifth_wheel_mounted': 20,
      'fifth_wheel_jaws': 21,
      'fifth_wheel_damage': 22,
      'coupling_lines': 23,
      // Section 2 - Full Walk-Around
      'windshield': 24,
      'wipers': 25,
      'mirrors': 26,
      'door': 27,
      'fuel_tank': 28,
      'def_tank': 29,
      'suspension': 30,
      'frame': 31,
      'exhaust': 32,
      'trailer_tires': 33,
      'trailer_brakes': 34,
      'trailer_reflectors': 35,
      'trailer_doors': 36,
      'trailer_floor': 37,
      'rear_lights': 38,
      'reflectors': 39,
      'bumper': 40,
      'fire_extinguisher': 41,
      'warning_triangles': 42,
      'spare_fuses': 43,
    };

    // Location-based order (front to back)
    const locationOrder: Record<string, number> = {
      'windshield': 1,
      'wipers': 2,
      'headlights_low_beam': 3,
      'headlights_high_beam': 4,
      'turn_signals': 5,
      'front_wheels': 6,
      'mirrors': 7,
      'side_windows': 8,
      'fuel_tank': 9,
      'side_lights': 10,
      'rear_wheels': 11,
      'brake_lights': 12,
      'rear_lights': 13,
      'bumper': 14,
      'brakes': 15,
      'steering': 16,
      'horn': 17,
      'fluid_levels': 18,
      'dashboard_indicators': 19,
      'seatbelt': 20,
    };

    const orderMap = flowType === 'critical-issue-first' ? riskFirstOrder : locationOrder;

    // Sort items based on the selected flow type
    const sorted = [...items].sort((a, b) => {
      const orderA = orderMap[a.item_key] ?? (flowType === 'critical-issue-first' ? 999 : a.display_order);
      const orderB = orderMap[b.item_key] ?? (flowType === 'critical-issue-first' ? 999 : b.display_order);
      return orderA - orderB;
    });

    return sorted;
  },
};
