// api/tickets-overview.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../src/lib/supabase"; // adjust path if needed

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "50"), 200);
    const page = Math.max(parseInt((req.query.page as string) || "1"), 1);
    const fromDate = req.query.fromDate as string | undefined; // "YYYY-MM-DD" from frontend
    const offset = (page - 1) * limit;

    // Base select (same table as ticketService)
    let query = supabase.from("tickets").select("*", { count: "exact" });

    // Optional date filter: >= fromDate (00:00)
    if (fromDate) {
      // Interpret fromDate as local-day start (00:00) and convert to ISO
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      const startIso = start.toISOString();
      query = query.gte("created_at", startIso);
    }

    // Range pagination + order (mirroring your getAllTickets)
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("tickets-overview Supabase error:", error);
      return res.status(500).json({ error: "Failed to load tickets overview" });
    }

    const tickets = data || [];
    const total = count ?? tickets.length;

    return res.status(200).json({
      tickets,
      total,
      page,
      pageSize: limit,
    });
  } catch (err) {
    console.error("tickets-overview handler error:", err);
    return res
      .status(500)
      .json({ error: "Unexpected error in tickets overview API" });
  }
}