import { supabase } from "./supabase";

export interface InvoiceRequest {
  start_date: string; // ISO 8601 format: 2025-01-01
  end_date: string; // ISO 8601 format: 2025-01-31
  carrier?: string; // Optional: filter by carrier
  destination_site?: string; // Optional: filter by destination site
}

export interface InvoiceResponse {
  success: boolean;
  pdfBlob?: Blob;
  html?: string;
  error?: string;
  invoice_number?: string;
  total?: number;
}

/**
 * Generate invoice PDF for tickets in a date range
 * @param request Invoice request with date range and optional filters
 * @returns Invoice PDF Blob or error
 */
export async function generateInvoice(
  request: InvoiceRequest
): Promise<InvoiceResponse> {
  try {
    const response = await supabase.functions.invoke("generate-invoice", {
      body: request,
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message || "Failed to generate invoice",
      };
    }

    // Response is now a PDF blob
    const pdfBlob = new Blob([response.data], { type: "application/pdf" });

    return {
      success: true,
      pdfBlob: pdfBlob,
    };
  } catch (error) {
    console.error("Error generating invoice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate invoice and download as PDF
 * @param request Invoice request
 * @param filename Optional filename for download
 */
export async function generateAndDownloadInvoicePDF(
  request: InvoiceRequest,
  filename?: string
): Promise<void> {
  try {
    const result = await generateInvoice(request);

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
  } catch (error) {
    console.error("Error downloading invoice:", error);
    throw error;
  }
}

/**
 * Generate invoice and display in modal
 * @param request Invoice request
 * @returns Invoice PDF Blob
 */
export async function generateInvoiceForDisplay(
  request: InvoiceRequest
): Promise<Blob> {
  const result = await generateInvoice(request);

  if (!result.success || !result.pdfBlob) {
    throw new Error(result.error || "Failed to generate invoice");
  }

  return result.pdfBlob;
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get date range for current month
 */
export function getCurrentMonthDateRange(): {
  start_date: string;
  end_date: string;
} {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start_date: formatDateForAPI(start),
    end_date: formatDateForAPI(end),
  };
}

/**
 * Get date range for previous month
 */
export function getPreviousMonthDateRange(): {
  start_date: string;
  end_date: string;
} {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    start_date: formatDateForAPI(start),
    end_date: formatDateForAPI(end),
  };
}

/**
 * Get date range for last N days
 */
export function getLastNDaysDateRange(days: number): {
  start_date: string;
  end_date: string;
} {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    start_date: formatDateForAPI(start),
    end_date: formatDateForAPI(end),
  };
}

/**
 * Get date range for custom period
 */
export function getCustomDateRange(
  startDate: Date,
  endDate: Date
): {
  start_date: string;
  end_date: string;
} {
  return {
    start_date: formatDateForAPI(startDate),
    end_date: formatDateForAPI(endDate),
  };
}
