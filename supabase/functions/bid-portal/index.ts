// Bid portal: token-gated, public-facing API for carriers to view & submit bids.
// JWT verification is intentionally OFF; auth is via the per-bid bid_token.

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

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const { token, action } = payload ?? {};
  if (!token || typeof token !== "string") return err("Missing token");
  if (!action || typeof action !== "string") return err("Missing action");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return err("Server misconfigured", 500);

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: bid, error: bidErr } = await sb
    .from("bids")
    .select(
      `id, load_id, carrier_id, status, price, price_per_mile,
       estimated_transit_days, available_date, notes,
       submitted_at, viewed_at, created_at, updated_at,
       loads:load_id (
         id, reference_code, origin_address, origin_city, origin_state,
         destination_address, destination_city, destination_state,
         distance_miles, commodity, weight_lbs, equipment, pickup_date,
         delivery_date, hazmat, temperature_controlled, temperature_min,
         temperature_max, target_price, bid_deadline, status, notes
       ),
       carriers:carrier_id (
         id, name, primary_contact_name, contact_email
       )`
    )
    .eq("bid_token", token)
    .maybeSingle();

  if (bidErr) return err("Database error", 500, { detail: bidErr.message });
  if (!bid) return err("Invalid or expired link", 404);

  const load = (bid as any).loads;
  const carrier = (bid as any).carriers;
  if (!load || !carrier) return err("Linked load or carrier not found", 404);

  const now = new Date();
  const deadline = new Date(load.bid_deadline);
  const closed = now >= deadline;
  const loadCancelled = load.status === "cancelled";

  const sanitized = {
    bid: {
      id: bid.id,
      status: bid.status,
      price: bid.price,
      price_per_mile: bid.price_per_mile,
      estimated_transit_days: bid.estimated_transit_days,
      available_date: bid.available_date,
      notes: bid.notes,
      submitted_at: bid.submitted_at,
      viewed_at: bid.viewed_at,
    },
    load,
    carrier,
    closed,
    deadline_passed: closed,
    load_cancelled: loadCancelled,
  };

  if (action === "get") {
    if (!bid.viewed_at && !closed) {
      const { error: vErr } = await sb
        .from("bids")
        .update({
          viewed_at: now.toISOString(),
          status: bid.status === "invited" ? "viewed" : bid.status,
        })
        .eq("id", bid.id);
      if (vErr) {
        console.error("viewed_at update failed", vErr);
      } else {
        sanitized.bid.viewed_at = now.toISOString();
        if (sanitized.bid.status === "invited") sanitized.bid.status = "viewed";
      }
      await sb.from("bid_audit").insert({
        bid_id: bid.id,
        load_id: load.id,
        actor_type: "carrier",
        actor_id: carrier.id,
        action: "bid_viewed",
        previous_status: "invited",
        new_status: "viewed",
        metadata: {},
      });
    }
    return json(sanitized);
  }

  if (action === "submit" || action === "update") {
    if (loadCancelled) return err("This load has been cancelled", 409);
    if (closed) return err("Bidding has closed for this load", 409);
    if (["awarded", "declined", "withdrawn"].includes(bid.status)) {
      return err(`Cannot modify a bid in status "${bid.status}"`, 409);
    }

    const {
      price,
      estimated_transit_days,
      available_date,
      notes: bidNotes,
    } = payload ?? {};

    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      return err("price is required and must be a number");
    }
    if (Number(price) <= 0) return err("price must be greater than 0");

    const update: Record<string, unknown> = {
      price: Number(price),
      status: "submitted",
      submitted_at: bid.submitted_at ?? now.toISOString(),
      notes: bidNotes ?? null,
      available_date: available_date ?? null,
    };
    if (estimated_transit_days !== undefined && estimated_transit_days !== null) {
      const days = Number(estimated_transit_days);
      if (Number.isNaN(days) || days < 0) {
        return err("estimated_transit_days must be a non-negative number");
      }
      update.estimated_transit_days = days;
    }

    const { data: updated, error: upErr } = await sb
      .from("bids")
      .update(update)
      .eq("id", bid.id)
      .select(
        "id, status, price, price_per_mile, estimated_transit_days, available_date, notes, submitted_at, viewed_at"
      )
      .single();

    if (upErr) return err("Failed to save bid", 500, { detail: upErr.message });

    await sb.from("bid_audit").insert({
      bid_id: bid.id,
      load_id: load.id,
      actor_type: "carrier",
      actor_id: carrier.id,
      action: action === "submit" ? "bid_submitted" : "bid_updated",
      previous_status: bid.status,
      new_status: "submitted",
      metadata: { price: Number(price) },
    });

    return json({
      ...sanitized,
      bid: { ...sanitized.bid, ...updated },
    });
  }

  if (action === "withdraw") {
    if (loadCancelled) return err("This load has been cancelled", 409);
    if (closed) return err("Bidding has closed for this load", 409);
    if (["awarded", "declined", "withdrawn"].includes(bid.status)) {
      return err(`Cannot withdraw a bid in status "${bid.status}"`, 409);
    }
    const { error: wErr } = await sb
      .from("bids")
      .update({ status: "withdrawn" })
      .eq("id", bid.id);
    if (wErr) return err("Failed to withdraw bid", 500, { detail: wErr.message });
    await sb.from("bid_audit").insert({
      bid_id: bid.id,
      load_id: load.id,
      actor_type: "carrier",
      actor_id: carrier.id,
      action: "bid_withdrawn",
      previous_status: bid.status,
      new_status: "withdrawn",
      metadata: {},
    });
    return json({ ...sanitized, bid: { ...sanitized.bid, status: "withdrawn" } });
  }

  return err(`Unknown action: ${action}`);
});
