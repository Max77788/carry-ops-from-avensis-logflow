/**
 * HTTP-based Ticket Processing API Caller
 * Use this to call the process-tickets edge function via direct HTTP requests
 * No Supabase client library needed
 */

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
 * Call the process-tickets edge function via HTTP
 * @returns Promise with processing results
 */
export async function callTicketProcessingAPI(): Promise<ProcessingResponse> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase credentials in environment variables");
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-tickets`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data as ProcessingResponse;
  } catch (error) {
    console.error("Error calling ticket processing API:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Call the API with timeout
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export async function callTicketProcessingAPIWithTimeout(
  timeoutMs: number = 30000
): Promise<ProcessingResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase credentials in environment variables");
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-tickets`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data as ProcessingResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: `Request timeout after ${timeoutMs}ms`,
      };
    }

    console.error("Error calling ticket processing API:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Call the API with retry logic
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 */
export async function callTicketProcessingAPIWithRetry(
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<ProcessingResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to call ticket processing API`);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase credentials in environment variables");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-tickets`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`Successfully called API on attempt ${attempt}`);
      return data as ProcessingResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(`All ${maxRetries} attempts failed`);
  return {
    success: false,
    error: lastError?.message || "Failed after all retry attempts",
  };
}

/**
 * Get the API endpoint URL
 */
export function getTicketProcessingAPIUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL environment variable");
  }
  return `${supabaseUrl}/functions/v1/process-tickets`;
}

/**
 * Get the authorization header
 */
export function getAuthorizationHeader(): string {
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY environment variable");
  }
  return `Bearer ${supabaseAnonKey}`;
}

