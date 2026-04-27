import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { inspection_id, truck_id } = await req.json();

    if (!inspection_id || !truck_id) {
      return new Response(
        JSON.stringify({ error: "Missing inspection_id or truck_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the inspection
    const { data: inspection, error: inspectionError } = await supabaseClient
      .from("truck_daily_inspections")
      .select("*")
      .eq("id", inspection_id)
      .single();

    if (inspectionError) throw inspectionError;

    // Count the number of "not_working" items in this inspection
    const { count: issuesCount, error: countError } = await supabaseClient
      .from("truck_inspection_item_status")
      .select("*", { count: "exact", head: true })
      .eq("inspection_id", inspection_id)
      .eq("status", "not_working");

    if (countError) throw countError;

    // Determine compliance status based on issues
    let compliance_status = "active";
    let last_inspection_status = "passed";

    if (issuesCount && issuesCount > 0) {
      compliance_status = "restricted";
      last_inspection_status = "issues_reported";
    }

    // Update the truck's compliance status
    const { error: updateError } = await supabaseClient
      .from("trucks")
      .update({
        compliance_status,
        last_inspection_date: inspection.inspection_date,
        last_inspection_status,
      })
      .eq("id", truck_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        compliance_status,
        issues_count: issuesCount || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

