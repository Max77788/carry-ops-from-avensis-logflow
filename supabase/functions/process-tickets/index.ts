import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Configuration
const HOURS_LOOKBACK = 24; // Variable for lookback period
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = "gpt-4o"; // or "gpt-4o" for newer model

interface ProcessingResult {
  ticket_id: string;
  success: boolean;
  extracted_data?: {
    ticket_id?: string;
    gross_weight?: number;
    net_weight?: number;
  };
  error?: string;
}

/**
 * Extract text from image using OpenAI Vision API
 */
async function extractTextFromImage(imageUrl: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text from this ticket image. Return only the extracted text without any additional commentary.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenAI API error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";

    if (!extractedText) {
      throw new Error("No text content in OpenAI response");
    }

    return extractedText;
  } catch (error) {
    console.error("Error extracting text from image:", error);
    throw error;
  }
}

/**
 * Parse extracted text to find ticket values
 */
function parseTicketData(text: string): {
  ticket_id?: string;
  gross_weight?: number;
  net_weight?: number;
} {
  const result: any = {};

  // Extract Ticket ID (pattern: TKT-XXXXX or similar)
  const ticketMatch = text.match(/TKT-\d+/i);
  if (ticketMatch) {
    result.ticket_id = ticketMatch[0];
  }

  // Extract Gross Weight (pattern: "Gross Weight: XXX" or "GW: XXX")
  const grossWeightMatch = text.match(/(?:gross\s+weight|gw)\s*:?\s*([\d.]+)/i);
  if (grossWeightMatch) {
    result.gross_weight = parseFloat(grossWeightMatch[1]);
  }

  // Extract Net Weight (pattern: "Net Weight: XXX" or "NW: XXX")
  const netWeightMatch = text.match(/(?:net\s+weight|nw)\s*:?\s*([\d.]+)/i);
  if (netWeightMatch) {
    result.net_weight = parseFloat(netWeightMatch[1]);
  }

  return result;
}

/**
 * Process a single ticket
 */
async function processTicket(
  ticket: any,
  supabase: any
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    ticket_id: ticket.ticket_id,
    success: false,
  };

  try {
    // Check if ticket has an image
    if (!ticket.ticket_image_url) {
      result.error = "No image URL found";
      return result;
    }

    // Extract text from image
    const extractedText = await extractTextFromImage(ticket.ticket_image_url);

    if (!extractedText) {
      result.error = "No text extracted from image";
      return result;
    }

    // Parse the extracted text
    const parsedData = parseTicketData(extractedText);

    // Update ticket in database with extracted values
    const updateData: any = {};

    if (parsedData.gross_weight !== undefined) {
      updateData.gross_weight = parsedData.gross_weight;
    }

    if (parsedData.net_weight !== undefined) {
      updateData.net_weight = parsedData.net_weight;
    }

    // Only update if we found some data
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("ticket_id", ticket.ticket_id);

      if (error) {
        result.error = `Database update error: ${error.message}`;
        return result;
      }

      result.success = true;
      result.extracted_data = parsedData;
    } else {
      result.error = "No extractable data found in image";
    }
  } catch (error) {
    result.error = `Processing error: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }

  return result;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization (optional - can be removed for public access)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.warn("No authorization header provided");
      // Continue anyway - can be called without auth
    }

    // Create Supabase client with service role
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

    // Get tickets from last 24 hours that have images
    const hoursAgo = new Date(Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000);

    const { data: tickets, error: fetchError } = await supabase
      .from("tickets")
      .select("*")
      .gte("created_at", hoursAgo.toISOString())
      .not("ticket_image_url", "is", null);

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

    console.log(`Found ${tickets?.length || 0} tickets to process`);

    // Process each ticket
    const results: ProcessingResult[] = [];
    for (const ticket of tickets || []) {
      const result = await processTicket(ticket, supabase);
      results.push(result);
    }

    // Summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_processed: results.length,
          successful: successCount,
          failed: failureCount,
          lookback_hours: HOURS_LOOKBACK,
        },
        results: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
