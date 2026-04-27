import { supabase } from "./supabase";

export interface ProcessingResult {
  ticket_id: string;
  success: boolean;
  extracted_data?: {
    ticket_id?: string;
    gross_weight?: number;
    net_weight?: number;
  };
  error?: string;
}

export interface ProcessingResponse {
  success: boolean;
  summary?: {
    total_processed: number;
    successful: number;
    failed: number;
    lookback_hours: number;
  };
  results?: ProcessingResult[];
  error?: string;
}

/**
 * Call the process-tickets edge function to analyze and update tickets
 * This function processes tickets from the last 24 hours (configurable)
 * and extracts data from ticket images using OCR
 *
 * @returns Promise with processing results
 */
export async function processTicketsDaily(): Promise<ProcessingResponse> {
  try {
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }

    // Call the edge function
    const { data, error } = await supabase.functions.invoke(
      "process-tickets",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (error) {
      console.error("Error calling process-tickets function:", error);
      return {
        success: false,
        error: error.message || "Failed to process tickets",
      };
    }

    return data as ProcessingResponse;
  } catch (error) {
    console.error("Error in processTicketsDaily:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Schedule daily ticket processing
 * This can be called from your app initialization or a scheduled task
 *
 * @param hourOfDay - Hour of day to run processing (0-23, default: 2 AM)
 */
export function scheduleTicketProcessing(hourOfDay: number = 2): void {
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hourOfDay, 0, 0, 0);

  // If the scheduled time has already passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const timeUntilExecution = scheduledTime.getTime() - now.getTime();

  console.log(
    `Ticket processing scheduled for ${scheduledTime.toLocaleString()}`
  );

  // Set timeout for first execution
  setTimeout(() => {
    processTicketsDaily().then((result) => {
      console.log("Ticket processing completed:", result);
    });

    // Then schedule daily execution
    setInterval(() => {
      processTicketsDaily().then((result) => {
        console.log("Daily ticket processing completed:", result);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
  }, timeUntilExecution);
}

/**
 * Manually trigger ticket processing
 * Useful for testing or manual execution
 */
export async function triggerTicketProcessing(): Promise<ProcessingResponse> {
  console.log("Manually triggering ticket processing...");
  return processTicketsDaily();
}

