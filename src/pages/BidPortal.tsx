import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Send,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  Truck,
  Snowflake,
  Flame,
  Lock,
  Clock,
} from "lucide-react";
import {
  bidPortalClient,
  formatMoney,
  formatNumber,
  bidStatusBadgeClass,
  loadStatusBadgeClass,
  formatStatusLabel,
  type BidPortalGetResponse,
} from "@/lib/bidding";

const useCountdown = (deadline: string | undefined) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!deadline) return { closed: true, label: "" };
    const diff = new Date(deadline).getTime() - now;
    if (diff <= 0) return { closed: true, label: "Closed" };
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1000);
    return {
      closed: false,
      label: `${days > 0 ? `${days}d ` : ""}${hours
        .toString()
        .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`,
    };
  }, [now, deadline]);
};

const BidPortal = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<BidPortalGetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [transitDays, setTransitDays] = useState("");
  const [availableDate, setAvailableDate] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await bidPortalClient.get(token);
      setData(resp);
      setPrice(resp.bid.price?.toString() ?? "");
      // Default quantity: existing bid value, else remaining capacity (so the
      // carrier's default is "I'll take them all"), capped at remaining.
      const remaining = Math.max(resp.load.remaining_count ?? 1, 1);
      const existingQty = resp.bid.quantity;
      setQuantity(
        (existingQty && existingQty > 0 ? Math.min(existingQty, remaining) : remaining).toString()
      );
      setTransitDays(resp.bid.estimated_transit_days?.toString() ?? "");
      setAvailableDate(resp.bid.available_date ?? "");
      setNotes(resp.bid.notes ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const countdown = useCountdown(data?.load.bid_deadline);

  const livePpm = useMemo(() => {
    const p = Number(price);
    if (!p || !data?.load.distance_miles) return null;
    return p / Number(data.load.distance_miles);
  }, [price, data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !data) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const action = data.bid.status === "submitted" || data.bid.status === "shortlisted"
        ? "update"
        : "submit";
      const payload = {
        price: Number(price),
        quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
        estimated_transit_days: transitDays ? Number(transitDays) : null,
        available_date: availableDate || null,
        notes: notes || null,
      };
      const resp = await (action === "submit"
        ? bidPortalClient.submit(token, payload)
        : bidPortalClient.update(token, payload));
      setData(resp);
      setSuccess(action === "submit" ? "Bid submitted!" : "Bid updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Bid link not available</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">
            If you believe this is a mistake, please contact the shipper that sent you this link.
          </p>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { load: l, carrier, bid, closed, load_cancelled, load_fully_awarded } = data;
  const remaining = Math.max(l.remaining_count ?? l.load_count, 0);
  const lockedReason = load_cancelled
    ? "This load has been cancelled by the shipper."
    : closed
    ? "Bidding has closed for this load."
    : load_fully_awarded
    ? "This load has been fully awarded to other carriers."
    : ["awarded", "declined", "withdrawn"].includes(bid.status)
    ? bid.status === "awarded"
      ? `You've been awarded ${bid.quantity} load${bid.quantity === 1 ? "" : "s"} on this request.`
      : `This bid is now ${bid.status} and can no longer be modified.`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold">
            Hello, {carrier.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            You've been invited to bid on load{" "}
            <span className="font-medium">{l.reference_code}</span>.
          </p>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bid deadline</span>
            </div>
            <div className="text-right">
              <div className="text-sm">
                {new Date(l.bid_deadline).toLocaleString()}
              </div>
              <div className={`font-mono font-semibold ${countdown.closed ? "text-destructive" : "text-foreground"}`}>
                {countdown.label || "Closed"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Origin
              </div>
              <div className="font-medium">{l.origin_address}</div>
              <div className="text-sm text-muted-foreground">
                {[l.origin_city, l.origin_state].filter(Boolean).join(", ")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Destination
              </div>
              <div className="font-medium">{l.destination_address}</div>
              <div className="text-sm text-muted-foreground">
                {[l.destination_city, l.destination_state].filter(Boolean).join(", ")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Distance</div>
              <div className="font-medium">
                {l.distance_miles ? `${formatNumber(l.distance_miles, 0)} mi` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3" /> Equipment
              </div>
              <div className="font-medium">{l.equipment ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Commodity</div>
              <div className="font-medium">{l.commodity ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Weight</div>
              <div className="font-medium">
                {l.weight_lbs ? `${formatNumber(l.weight_lbs, 0)} lbs` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Loads available</div>
              <div className="font-medium">
                {remaining} of {l.load_count}{" "}
                <span className="text-xs text-muted-foreground">
                  ({l.awarded_count} awarded)
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Pickup
              </div>
              <div className="font-medium">{l.pickup_date ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Delivery
              </div>
              <div className="font-medium">{l.delivery_date ?? "—"}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {l.hazmat && (
              <Badge variant="destructive" className="gap-1">
                <Flame className="h-3 w-3" /> Hazmat
              </Badge>
            )}
            {l.temperature_controlled && (
              <Badge variant="secondary" className="gap-1">
                <Snowflake className="h-3 w-3" />
                Reefer {l.temperature_min ?? "?"}–{l.temperature_max ?? "?"}°F
              </Badge>
            )}
            <Badge
              variant="outline"
              className={loadStatusBadgeClass(l.status)}
            >
              Status: {formatStatusLabel(l.status)}
            </Badge>
            <Badge
              variant="outline"
              className={bidStatusBadgeClass(bid.status)}
            >
              Bid: {formatStatusLabel(bid.status)}
            </Badge>
          </div>

          {l.notes && (
            <div className="border-t pt-3">
              <div className="text-xs uppercase text-muted-foreground">Notes from shipper</div>
              <div className="text-sm whitespace-pre-wrap">{l.notes}</div>
            </div>
          )}
        </Card>

        {lockedReason ? (
          <Card className="p-6 text-center space-y-3 border-destructive/40">
            <Lock className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Bidding Has Closed</h2>
            <p className="text-muted-foreground text-sm">{lockedReason}</p>
            {bid.price && (
              <p className="text-sm">
                Your last submitted bid: <strong>{formatMoney(bid.price)}</strong>
                {bid.price_per_mile ? ` (${formatMoney(bid.price_per_mile)}/mi)` : ""}
              </p>
            )}
            {bid.status === "awarded" && (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> You won this load
              </Badge>
            )}
          </Card>
        ) : (
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-3">
              {bid.status === "submitted" || bid.status === "shortlisted"
                ? "Update your bid"
                : "Submit your bid"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {l.load_count > 1 && (
                <div className="rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-200 text-sm p-3">
                  This request is for <strong>{l.load_count} loads</strong>.{" "}
                  {remaining === l.load_count
                    ? "No carriers have been awarded yet — bid on as many as you can haul."
                    : `${remaining} of ${l.load_count} remain (${l.awarded_count} already awarded). You can bid on any subset of the remaining loads.`}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Your price per load (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                  {livePpm && (
                    <div className="text-xs text-muted-foreground">
                      ≈ {formatMoney(livePpm)}/mile
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Loads you can haul {l.load_count > 1 ? `(1–${remaining})` : ""}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={remaining}
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                  {Number(quantity) > 0 && Number(price) > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Total: {formatMoney(Number(price) * Number(quantity))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transit">Transit days (optional)</Label>
                  <Input
                    id="transit"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={transitDays}
                    onChange={(e) => setTransitDays(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="avail">Available date</Label>
                  <Input
                    id="avail"
                    type="date"
                    value={availableDate}
                    onChange={(e) => setAvailableDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes for shipper (optional)</Label>
                  <Textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {success}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {bid.status === "submitted" || bid.status === "shortlisted"
                  ? "Update bid"
                  : "Submit bid"}
              </Button>
            </form>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2">
          You're viewing this page through a private one-time link sent by the
          shipper. Other carriers cannot see your price.
        </p>
      </div>
    </div>
  );
};

export default BidPortal;
