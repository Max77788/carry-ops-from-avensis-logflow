// api/drivers-overview.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../src/lib/supabase"; // adjust path if needed

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "50"), 200);
    const page = Math.max(parseInt((req.query.page as string) || "1"), 1);
    const offset = (page - 1) * limit;

    // 1) Fetch drivers page with exact total count
    const {
      data: drivers,
      error: driversError,
      count: driversCount,
    } = await supabase
      .from("drivers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false }) // or "id" / "name" if you don't have created_at
      .range(offset, offset + limit - 1);

    if (driversError) {
      console.error("drivers-overview Supabase error (drivers):", driversError);
      console.log("lala1");
      return res.status(500).json({ error: "Failed to load drivers overview" });
    }

    const baseDrivers = drivers || [];
    const total = driversCount ?? baseDrivers.length;

    // If no drivers, return early
    if (baseDrivers.length === 0) {
      return res.status(200).json({
        drivers: [],
        total,
        page,
        pageSize: limit,
      });
    }

    // 2) Compute "today" range similar to your frontend "toDateString" logic
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const startIso = startOfDay.toISOString();

    const driverIds = baseDrivers.map((d: any) => d.id).filter(Boolean);

    // 3) Fetch today's CLOSED tickets for just these drivers
    const { data: ticketsToday, error: ticketsError } = await supabase
      .from("tickets")
      .select("driver_id, status, created_at")
      .in("driver_id", driverIds)
      .gte("created_at", startIso)
      .eq("status", "CLOSED");

    if (ticketsError) {
      console.error("drivers-overview Supabase error (tickets):", ticketsError);
      // We can still return drivers, just with 0 counts
      const driversWithZero = baseDrivers.map((d: any) => ({
        ...d,
        closed_tickets_today: 0,
      }));
      return res.status(200).json({
        drivers: driversWithZero,
        total,
        page,
        pageSize: limit,
      });
    }

    // 4) Aggregate closed tickets per driver_id
    const counts: Record<string, number> = {};
    (ticketsToday || []).forEach((t: any) => {
      const id = t.driver_id;
      if (!id) return;
      counts[id] = (counts[id] || 0) + 1;
    });

    // 5) Attach closed_tickets_today + keep shape similar to your FE
    const enrichedDrivers = baseDrivers.map((d: any) => ({
      ...d,
      closed_tickets_today: counts[d.id] || 0,
    }));

    return res.status(200).json({
      drivers: enrichedDrivers,
      total,
      page,
      pageSize: limit,
    });
  } catch (err) {
    console.error("drivers-overview handler error:", err);
    return res
      .status(500)
      .json({ error: "Unexpected error in drivers overview API" });
  }
}