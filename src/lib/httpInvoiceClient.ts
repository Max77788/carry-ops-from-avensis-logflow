/**
 * HTTP-based Invoice Generation Client
 * Call the invoice generation API directly via HTTP without Supabase client
 */

export interface InvoiceRequest {
  start_date: string; // ISO 8601 format: 2025-01-01
  end_date: string; // ISO 8601 format: 2025-01-31
  carrier?: string; // Optional: filter by carrier
  destination_site?: string; // Optional: filter by destination site
}

export interface InvoiceResponse {
  success: boolean;
  pdfBlob?: Blob;
  error?: string;
}

/**
 * Get the invoice generation API URL
 */
function getInvoiceAPIUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL not configured");
  }
  return `${supabaseUrl}/functions/v1/generate-invoice`;
}

/**
 * Get authorization header
 */
function getAuthorizationHeader(): string {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY not configured");
  }
  return `Bearer ${anonKey}`;
}

/**
 * Call invoice generation API via HTTP
 */
export async function callInvoiceAPI(
  request: InvoiceRequest
): Promise<InvoiceResponse> {
  try {
    const response = await fetch(getInvoiceAPIUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthorizationHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const pdfBlob = await response.blob();
    return {
      success: true,
      pdfBlob,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Call invoice API with timeout
 */
export async function callInvoiceAPIWithTimeout(
  request: InvoiceRequest,
  timeoutMs: number = 30000
): Promise<InvoiceResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getInvoiceAPIUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthorizationHeader(),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const pdfBlob = await response.blob();
    return {
      success: true,
      pdfBlob,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: `Request timeout after ${timeoutMs}ms`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Call invoice API with retry logic
 */
export async function callInvoiceAPIWithRetry(
  request: InvoiceRequest,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<InvoiceResponse> {
  let lastError: InvoiceResponse | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(getInvoiceAPIUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthorizationHeader(),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        lastError = {
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
        };

        // Retry on 5xx errors
        if (response.status >= 500 && attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayMs * attempt)
          );
          continue;
        }

        return lastError;
      }

      const pdfBlob = await response.blob();
      return {
        success: true,
        pdfBlob,
      };
    } catch (error) {
      lastError = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      // Retry on network errors
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
    }
  }

  return (
    lastError || {
      success: false,
      error: "Max retry attempts exceeded",
    }
  );
}

/**
 * Download invoice as PDF
 */
export async function downloadInvoicePDF(
  request: InvoiceRequest,
  filename?: string
): Promise<void> {
  const result = await callInvoiceAPI(request);

  if (!result.success || !result.pdfBlob) {
    throw new Error(result.error || "Failed to generate invoice");
  }

  // Create download link
  const url = URL.createObjectURL(result.pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `invoice-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Display invoice in modal
 */
export async function displayInvoiceInModal(
  request: InvoiceRequest
): Promise<Blob> {
  const result = await callInvoiceAPI(request);

  if (!result.success || !result.pdfBlob) {
    throw new Error(result.error || "Failed to generate invoice");
  }

  return result.pdfBlob;
}
