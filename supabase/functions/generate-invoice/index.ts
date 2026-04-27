import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  start_date: string; // ISO 8601 format: 2025-01-01
  end_date: string; // ISO 8601 format: 2025-01-31
  carrier?: string; // Optional: filter by carrier
  destination_site?: string; // Optional: filter by destination site
}

interface InvoiceLineItem {
  date: string;
  product: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  bill_to: string;
  line_items: InvoiceLineItem[];
  total: number;
  company_name: string;
  company_address: string;
  company_email: string;
  company_phone: string;
}

/**
 * Generate invoice number based on timestamp
 */
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = String(now.getTime()).slice(-5);
  return `INV-${year}${month}${day}-${time}`;
}

/**
 * Calculate due date (Net 30)
 */
function calculateDueDate(invoiceDate: string): string {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + 30);
  return date.toISOString().split("T")[0];
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Convert HTML to PDF using external service
 */
async function htmlToPdf(html: string): Promise<Uint8Array> {
  try {
    // Use html2pdf.app service to convert HTML to PDF
    const response = await fetch("https://api.html2pdf.app/v1/convert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: html,
        options: {
          margin: 10,
          filename: "invoice.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PDF conversion failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Decode base64 PDF
    const binaryString = atob(data.pdf);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  } catch (error) {
    console.error("Error converting HTML to PDF:", error);
    throw error;
  }
}

/**
 * Generate HTML for PDF
 */
function generateInvoiceHTML(data: InvoiceData): string {
  const lineItemsHTML = data.line_items
    .map(
      (item, index) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.date}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${
        item.product
      }</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${
        item.description
      }</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity.toFixed(
        2
      )}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(
        item.rate
      )}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(
        item.amount
      )}</td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company-info { flex: 1; }
        .company-info h1 { margin: 0; color: #333; }
        .company-info p { margin: 5px 0; color: #666; font-size: 14px; }
        .logo { flex: 1; text-align: right; }
        .logo img { max-width: 150px; }
        .invoice-details { background: #f5f5f5; padding: 15px; margin-bottom: 30px; }
        .invoice-details p { margin: 5px 0; }
        .bill-to { margin-bottom: 30px; }
        .bill-to h3 { margin: 0 0 10px 0; }
        .bill-to p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #333; color: white; padding: 10px; text-align: left; }
        .total-row { font-weight: bold; font-size: 18px; }
        .total-row td { padding: 15px 8px; border-top: 2px solid #333; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>INVOICE</h1>
          <p><strong>${data.company_name}</strong></p>
          <p>${data.company_address}</p>
          <p>${data.company_email}</p>
          <p>${data.company_phone}</p>
        </div>
        <div class="logo">
          <p style="font-size: 24px; color: #0066cc; font-weight: bold;">eTicketing</p>
        </div>
      </div>

      <div class="invoice-details">
        <h3>Invoice Details</h3>
        <p><strong>Invoice No.:</strong> ${data.invoice_number}</p>
        <p><strong>Invoice Date:</strong> ${data.invoice_date}</p>
        <p><strong>Due Date:</strong> ${data.due_date}</p>
        <p><strong>Terms:</strong> Net 30</p>
      </div>

      <div class="bill-to">
        <h3>Bill To</h3>
        <p>${data.bill_to}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Product or Service</th>
            <th>Description</th>
            <th style="text-align: right;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML}
          <tr class="total-row">
            <td colspan="6" style="text-align: right;">Total</td>
            <td style="text-align: right;">${formatCurrency(data.total)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated by eTicketing System</p>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: InvoiceRequest = await req.json();
    const { start_date, end_date, carrier, destination_site } = body;

    if (!start_date || !end_date) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: start_date and end_date",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Build query
    let query = supabase
      .from("tickets")
      .select("*")
      .gte("created_at", `${start_date}T00:00:00Z`)
      .lte("created_at", `${end_date}T23:59:59Z`)
      .eq("status", "DELIVERED");

    if (carrier) {
      query = query.eq("carrier", carrier);
    }

    if (destination_site) {
      query = query.eq("destination_site", destination_site);
    }

    const { data: tickets, error: fetchError } = await query;

    if (fetchError) {
      return new Response(
        JSON.stringify({
          error: `Failed to fetch tickets: ${fetchError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!tickets || tickets.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No tickets found for the specified date range",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate line items and calculate total
    const lineItems: InvoiceLineItem[] = tickets.map((ticket: any) => ({
      date: new Date(ticket.created_at).toLocaleDateString("en-US"),
      product: "Aggregate Hauling Services",
      description: `${ticket.origin_site} to ${ticket.destination_site}`,
      quantity: ticket.net_weight || ticket.gross_weight || 0,
      rate: 12.5, // Default rate - customize as needed
      amount: (ticket.net_weight || ticket.gross_weight || 0) * 12.5,
    }));

    const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Create invoice data
    const invoiceDate = new Date().toISOString().split("T")[0];
    const invoiceData: InvoiceData = {
      invoice_number: generateInvoiceNumber(),
      invoice_date: invoiceDate,
      due_date: calculateDueDate(invoiceDate),
      bill_to: carrier || "Customer",
      line_items: lineItems,
      total: total,
      company_name: "Avensis Energy Services, LLC",
      company_address: "1270 Crabb River Rd #600-126, Richmond, TX 77469",
      company_email: "avensisenergy@gmail.com",
      company_phone: "+1 (832) 922-2089",
    };

    // Generate HTML
    const html = generateInvoiceHTML(invoiceData);

    // Convert HTML to PDF
    const pdfBytes = await htmlToPdf(html);

    // Return PDF
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceData.invoice_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: `Function error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
