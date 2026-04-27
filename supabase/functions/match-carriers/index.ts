// match-carriers: shipper-authenticated function that creates invited bid rows
// (with unique tokens) for the carriers a shipper selects when posting a load.
// Auth: standard Supabase user JWT in the Authorization header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}
function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return json({ error: message, ...extra }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return err("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return err("Missing bearer token", 401);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const { load_id, carrier_ids, channel = "manual" } = payload ?? {};
  if (!load_id || typeof load_id !== "string") return err("Missing load_id");
  if (!Array.isArray(carrier_ids) || carrier_ids.length === 0) {
    return err("carrier_ids must be a non-empty array");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return err("Server misconfigured", 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return err("Unauthorized", 401);
  const userId = userData.user.id;

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: load, error: loadErr } = await sb
    .from("loads")
    .select("id, shipper_id, reference_code, status")
    .eq("id", load_id)
    .maybeSingle();
  if (loadErr) return err("Database error", 500, { detail: loadErr.message });
  if (!load) return err("Load not found", 404);
  if (load.shipper_id !== userId) return err("Not your load", 403);

  // Carriers come from the canonical companies directory (type = 'Carrier').
  // Any authenticated shipper can invite any carrier from this directory.
  const { data: carriers, error: cErr } = await sb
    .from("companies")
    .select("id, name, primary_contact_name, contact_email, contact_phone")
    .in("id", carrier_ids)
    .eq("type", "Carrier");
  if (cErr) return err("Database error", 500, { detail: cErr.message });
  if (!carriers || carriers.length === 0) return err("No matching carriers found", 400);

  const validIds = new Set(carriers.map((c) => c.id));
  const skipped = carrier_ids.filter((id: string) => !validIds.has(id));

  const newBids = Array.from(validIds).map((cid) => ({
    load_id,
    carrier_id: cid as string,
    status: "invited",
  }));

  const { data: insertedBids, error: insErr } = await sb
    .from("bids")
    .upsert(newBids, { onConflict: "load_id,carrier_id", ignoreDuplicates: true })
    .select("id, carrier_id, bid_token, status, created_at");
  if (insErr) return err("Failed to create bids", 500, { detail: insErr.message });

  const { data: allBids, error: aErr } = await sb
    .from("bids")
    .select("id, carrier_id, bid_token, status, created_at")
    .eq("load_id", load_id)
    .in("carrier_id", Array.from(validIds));
  if (aErr) return err("Database error", 500, { detail: aErr.message });

  const carriersById = new Map(carriers.map((c) => [c.id, c]));
  const invitationRows = (allBids ?? []).map((b: any) => {
    const c = carriersById.get(b.carrier_id);
    return {
      bid_id: b.id,
      channel,
      recipient: c?.contact_email ?? c?.contact_phone ?? null,
      delivery_status: "queued",
    };
  });
  if (invitationRows.length > 0) {
    await sb.from("carrier_invitations").insert(invitationRows);
  }

  const url = new URL(req.url);
  const portalBase =
    Deno.env.get("BID_PORTAL_BASE_URL") ??
    `${url.protocol}//${url.host.replace(/^[^.]+\./, "")}`;

  const result = (allBids ?? []).map((b: any) => {
    const c = carriersById.get(b.carrier_id);
    return {
      bid_id: b.id,
      carrier_id: b.carrier_id,
      carrier_name: c?.name ?? null,
      contact_email: c?.contact_email ?? null,
      status: b.status,
      bid_token: b.bid_token,
      bid_url: `${portalBase.replace(/\/$/, "")}/bid/${b.bid_token}`,
    };
  });

  return json({
    load_id,
    invited: result,
    skipped_unknown_carriers: skipped,
    inserted_count: insertedBids?.length ?? 0,
  });
});
