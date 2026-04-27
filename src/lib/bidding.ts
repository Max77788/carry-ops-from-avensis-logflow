import { supabase } from "./supabase";

export type LoadStatus =
  | "open"
  | "partially_awarded"
  | "awarded"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled";

export type BidStatus =
  | "invited"
  | "viewed"
  | "submitted"
  | "shortlisted"
  | "awarded"
  | "declined"
  | "withdrawn";

export interface Load {
  id: string;
  shipper_id: string;
  reference_code: string;
  origin_address: string;
  origin_city: string | null;
  origin_state: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_address: string;
  destination_city: string | null;
  destination_state: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  distance_miles: number | null;
  commodity: string | null;
  weight_lbs: number | null;
  equipment: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  hazmat: boolean;
  temperature_controlled: boolean;
  temperature_min: number | null;
  temperature_max: number | null;
  target_price: number | null;
  bid_deadline: string;
  status: LoadStatus;
  awarded_bid_id: string | null;
  notes: string | null;
  load_count: number;
  awarded_count: number;
  created_at: string;
  updated_at: string;
}

export interface LoadSummary extends Load {
  remaining_count: number;
  total_bids: number;
  submitted_bids: number;
  viewed_bids: number;
  invited_bids: number;
  lowest_price: number | null;
  lowest_ppm: number | null;
}

/**
 * Carrier as stored in the existing public.companies table (type='Carrier').
 * This is the canonical carrier directory shared with the rest of the app
 * (vendor onboarding, ticketing, etc.). The bidding feature reads from it
 * but does not create / mutate carriers.
 */
export interface CarrierCompany {
  id: string;
  name: string;
  primary_contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  mc_number: string | null;
  dot_number: string | null;
  city: string | null;
  state: string | null;
  business_address: string | null;
  status: string | null;
  approval_status: boolean | null;
  portal_access_enabled: boolean | null;
}

export interface Bid {
  id: string;
  load_id: string;
  carrier_id: string;
  bid_token: string;
  price: number | null;
  price_per_mile: number | null;
  quantity: number;
  estimated_transit_days: number | null;
  available_date: string | null;
  notes: string | null;
  status: BidStatus;
  ai_rank: number | null;
  ai_notes: string | null;
  submitted_at: string | null;
  viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidWithCarrier extends Bid {
  carrier: CarrierCompany;
}

export interface CarrierRating {
  id: string;
  load_id: string;
  carrier_id: string;
  shipper_id: string;
  rating_overall: number;
  rating_communication: number | null;
  rating_timeliness: number | null;
  rating_condition: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

const t = (name: string) => name as never;

const CARRIER_COLUMNS =
  "id, name, primary_contact_name, contact_email, contact_phone, mc_number, dot_number, city, state, business_address, status, approval_status, portal_access_enabled";

export const biddingService = {
  // ---------- Loads ----------
  async listLoads(): Promise<LoadSummary[]> {
    const { data, error } = await supabase
      .from(t("v_load_summary"))
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as LoadSummary[];
  },

  async getLoad(id: string): Promise<Load | null> {
    const { data, error } = await supabase
      .from(t("loads"))
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Load) ?? null;
  },

  async createLoad(input: Partial<Load> & { shipper_id: string }): Promise<Load> {
    const { data, error } = await supabase
      .from(t("loads"))
      .insert(input as never)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as Load;
  },

  async updateLoad(id: string, patch: Partial<Load>): Promise<Load> {
    const { data, error } = await supabase
      .from(t("loads"))
      .update(patch as never)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as Load;
  },

  async deleteLoad(id: string): Promise<void> {
    const { error } = await supabase.from(t("loads")).delete().eq("id", id);
    if (error) throw error;
  },

  // ---------- Bids ----------
  async listBidsForLoad(loadId: string): Promise<BidWithCarrier[]> {
    const { data, error } = await supabase
      .from(t("bids"))
      .select(
        `id, load_id, carrier_id, bid_token, price, price_per_mile,
         estimated_transit_days, available_date, notes, status,
         ai_rank, ai_notes, submitted_at, viewed_at, created_at, updated_at,
         carrier:companies!bids_carrier_id_fkey (${CARRIER_COLUMNS})`
      )
      .eq("load_id", loadId)
      .order("ai_rank", { ascending: true, nullsFirst: false })
      .order("price", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as unknown as BidWithCarrier[];
  },

  async setBidStatus(bidId: string, status: BidStatus): Promise<void> {
    const { error } = await supabase
      .from(t("bids"))
      .update({ status } as never)
      .eq("id", bidId);
    if (error) throw error;
  },

  async awardBid(bidId: string): Promise<void> {
    const { error } = await supabase.rpc("award_bid" as never, {
      p_bid_id: bidId,
    } as never);
    if (error) throw error;
  },

  // ---------- Carrier directory (read-only, sourced from public.companies) ----------
  async listCarriers(activeOnly = false): Promise<CarrierCompany[]> {
    let q = supabase
      .from(t("companies"))
      .select(CARRIER_COLUMNS)
      .eq("type", "Carrier")
      .order("name", { ascending: true });
    if (activeOnly) q = q.eq("status", "Active");
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as CarrierCompany[];
  },

  async getCarrier(id: string): Promise<CarrierCompany | null> {
    const { data, error } = await supabase
      .from(t("companies"))
      .select(CARRIER_COLUMNS)
      .eq("id", id)
      .eq("type", "Carrier")
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as CarrierCompany) ?? null;
  },

  // ---------- Edge function: invite carriers to bid ----------
  async inviteCarriers(
    loadId: string,
    carrierIds: string[]
  ): Promise<{
    invited: Array<{
      bid_id: string;
      carrier_id: string;
      carrier_name: string | null;
      bid_token: string;
      bid_url: string;
      status: string;
    }>;
  }> {
    const { data, error } = await supabase.functions.invoke("match-carriers", {
      body: { load_id: loadId, carrier_ids: carrierIds, channel: "manual" },
    });
    if (error) throw error;
    return data as never;
  },

  // ---------- Ratings ----------
  async getRatingForLoad(loadId: string): Promise<CarrierRating | null> {
    const { data, error } = await supabase
      .from(t("carrier_ratings"))
      .select("*")
      .eq("load_id", loadId)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as CarrierRating) ?? null;
  },

  async upsertRating(
    input: Omit<CarrierRating, "id" | "created_at" | "updated_at">
  ): Promise<CarrierRating> {
    const { data, error } = await supabase
      .from(t("carrier_ratings"))
      .upsert(input as never, { onConflict: "load_id,shipper_id" })
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as CarrierRating;
  },
};

// ---------- Admin-side bidding oversight client ----------
// Uses the admin-bidding edge function with a shared admin token (stored in
// sessionStorage after the legacy admin login). Bypasses shipper-scoped RLS.

export interface AdminLoadRow extends LoadSummary {
  shipper_company_name: string | null;
  shipper_contact_name: string | null;
}

export interface AdminShipperRow {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  created_at: string;
  load_count_total: number;
  load_count_open: number;
}

export interface AdminBiddingStats {
  total_loads: number;
  open_loads: number;
  total_bids: number;
  total_shippers: number;
}

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("adminToken") ?? "";
}

async function callAdminBidding(body: Record<string, unknown>) {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session expired. Please log in again.");
  const { data, error } = await supabase.functions.invoke("admin-bidding", {
    body,
    headers: { "x-admin-token": token },
  });
  if (error) {
    const msg = (data as { error?: string } | undefined)?.error ?? error.message;
    throw new Error(msg);
  }
  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
    throw new Error((data as { error: string }).error);
  }
  return data;
}

export const adminBiddingClient = {
  async listLoads(filters: { status?: LoadStatus; shipper_id?: string; limit?: number } = {}): Promise<AdminLoadRow[]> {
    const r = (await callAdminBidding({ action: "list_loads", ...filters })) as {
      loads: AdminLoadRow[];
    };
    return r.loads ?? [];
  },

  async getLoad(loadId: string): Promise<{ load: Load; shipper: { id: string; company_name: string; contact_name: string | null; phone: string | null } | null }> {
    return (await callAdminBidding({ action: "get_load", load_id: loadId })) as never;
  },

  async listBids(loadId: string): Promise<BidWithCarrier[]> {
    const r = (await callAdminBidding({ action: "list_bids", load_id: loadId })) as {
      bids: BidWithCarrier[];
    };
    return r.bids ?? [];
  },

  async listShippers(): Promise<AdminShipperRow[]> {
    const r = (await callAdminBidding({ action: "list_shippers" })) as {
      shippers: AdminShipperRow[];
    };
    return r.shippers ?? [];
  },

  async cancelLoad(loadId: string): Promise<Load> {
    const r = (await callAdminBidding({ action: "cancel_load", load_id: loadId })) as {
      load: Load;
    };
    return r.load;
  },

  async awardBid(bidId: string): Promise<void> {
    await callAdminBidding({ action: "award_bid", bid_id: bidId });
  },

  async stats(): Promise<AdminBiddingStats> {
    return (await callAdminBidding({ action: "stats" })) as AdminBiddingStats;
  },
};

// ---------- Public bid portal client (carrier-side, token-based) ----------

export interface BidPortalGetResponse {
  bid: {
    id: string;
    status: BidStatus;
    price: number | null;
    price_per_mile: number | null;
    quantity: number;
    estimated_transit_days: number | null;
    available_date: string | null;
    notes: string | null;
    submitted_at: string | null;
    viewed_at: string | null;
  };
  load: Load & { remaining_count: number };
  carrier: {
    id: string;
    name: string;
    primary_contact_name: string | null;
    contact_email: string | null;
  };
  closed: boolean;
  deadline_passed: boolean;
  load_cancelled: boolean;
  load_fully_awarded: boolean;
}

export interface BidPortalSubmitInput {
  price: number;
  quantity?: number;
  estimated_transit_days?: number | null;
  available_date?: string | null;
  notes?: string | null;
}

async function callBidPortal(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("bid-portal", {
    body,
  });
  if (error) {
    const msg = (data as { error?: string } | undefined)?.error ?? error.message;
    throw new Error(msg);
  }
  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
    throw new Error((data as { error: string }).error);
  }
  return data;
}

export const bidPortalClient = {
  async get(token: string) {
    return (await callBidPortal({ token, action: "get" })) as BidPortalGetResponse;
  },
  async submit(token: string, input: BidPortalSubmitInput) {
    return (await callBidPortal({ token, action: "submit", ...input })) as BidPortalGetResponse;
  },
  async update(token: string, input: BidPortalSubmitInput) {
    return (await callBidPortal({ token, action: "update", ...input })) as BidPortalGetResponse;
  },
  async withdraw(token: string) {
    return (await callBidPortal({ token, action: "withdraw" })) as BidPortalGetResponse;
  },
};

// ---------- Helpers ----------

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(n));
}

// Tailwind class helpers used with Badge variant="outline" so each status
// gets a distinct, semantic color instead of the limited default palette.

export function bidStatusBadgeClass(status: BidStatus): string {
  switch (status) {
    case "awarded":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    case "submitted":
      return "border-sky-500/40 bg-sky-500/15 text-sky-300";
    case "shortlisted":
      return "border-violet-500/40 bg-violet-500/15 text-violet-300";
    case "viewed":
      return "border-amber-500/40 bg-amber-500/15 text-amber-300";
    case "invited":
      return "border-slate-500/40 bg-slate-500/15 text-slate-300";
    case "declined":
      return "border-red-500/40 bg-red-500/15 text-red-300";
    case "withdrawn":
      return "border-zinc-500/40 bg-zinc-500/15 text-zinc-300";
    default:
      return "border-slate-500/40 bg-slate-500/15 text-slate-300";
  }
}

export function loadStatusBadgeClass(status: LoadStatus): string {
  switch (status) {
    case "open":
      return "border-sky-500/40 bg-sky-500/15 text-sky-300";
    case "partially_awarded":
      return "border-amber-500/40 bg-amber-500/15 text-amber-300";
    case "awarded":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    case "in_transit":
      return "border-indigo-500/40 bg-indigo-500/15 text-indigo-300";
    case "delivered":
      return "border-teal-500/40 bg-teal-500/15 text-teal-300";
    case "completed":
      return "border-slate-500/40 bg-slate-500/15 text-slate-300";
    case "cancelled":
      return "border-red-500/40 bg-red-500/15 text-red-300";
    default:
      return "border-slate-500/40 bg-slate-500/15 text-slate-300";
  }
}

export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

// Backwards-compat: a few callers still use the variant helpers. Map them to
// "outline" so the className above is what actually paints the badge.
export function bidStatusVariant(_status: BidStatus) {
  return "outline" as const;
}

export function loadStatusVariant(_status: LoadStatus) {
  return "outline" as const;
}
