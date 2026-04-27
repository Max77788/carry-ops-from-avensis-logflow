import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Copy,
  CheckCircle2,
  Star,
  XCircle,
  Send,
} from "lucide-react";
import {
  biddingService,
  bidStatusBadgeClass,
  loadStatusBadgeClass,
  formatStatusLabel,
  formatMoney,
  formatNumber,
  type BidWithCarrier,
  type Load,
  type LoadStatus,
} from "@/lib/bidding";
import { toast } from "@/hooks/use-toast";
import { AwardModal } from "@/components/shipper/AwardModal";
import { RatingModal } from "@/components/shipper/RatingModal";

const Countdown: React.FC<{ deadline: string }> = ({ deadline }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return <span className="text-destructive font-medium">Bidding closed</span>;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return (
    <span className="font-medium">
      {days > 0 ? `${days}d ` : ""}
      {hours.toString().padStart(2, "0")}:
      {minutes.toString().padStart(2, "0")}:
      {seconds.toString().padStart(2, "0")}
    </span>
  );
};

const LoadDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load | null>(null);
  const [bids, setBids] = useState<BidWithCarrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [awardOpen, setAwardOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<BidWithCarrier | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [l, bs] = await Promise.all([
        biddingService.getLoad(id),
        biddingService.listBidsForLoad(id),
      ]);
      setLoad(l);
      setBids(bs);
    } catch (e) {
      toast({
        title: "Failed to load",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const awardedBids = useMemo(
    () => bids.filter((b) => b.status === "awarded"),
    [bids]
  );
  // Keep the "single awarded" alias for the rating flow; it's fine to rate
  // the first awarded carrier when there are multiple.
  const awardedBid = awardedBids[0] ?? null;

  const submittedBids = bids.filter((b) =>
    ["submitted", "shortlisted", "awarded"].includes(b.status)
  );
  const otherBids = bids.filter((b) => !["submitted", "shortlisted", "awarded"].includes(b.status));

  const baseUrl = `${window.location.origin}/bid/`;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${baseUrl}${token}`);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const updateLoadStatus = async (status: LoadStatus) => {
    if (!load) return;
    setStatusUpdating(true);
    try {
      const updated = await biddingService.updateLoad(load.id, { status });
      setLoad(updated);
      toast({ title: `Load marked ${status.replace("_", " ")}` });
    } catch (e) {
      toast({
        title: "Failed to update status",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  const cancelLoad = async () => {
    if (!load) return;
    if (!confirm("Cancel this load? Carriers will see a closed-bidding state."))
      return;
    await updateLoadStatus("cancelled");
  };

  if (loading || !load) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const deadlinePassed = new Date(load.bid_deadline) <= new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{load.reference_code}</h1>
        <Badge
          variant="outline"
          className={loadStatusBadgeClass(load.status)}
        >
          {formatStatusLabel(load.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Origin</div>
              <div className="font-medium">{load.origin_address}</div>
              <div className="text-sm text-muted-foreground">
                {[load.origin_city, load.origin_state].filter(Boolean).join(", ")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Destination</div>
              <div className="font-medium">{load.destination_address}</div>
              <div className="text-sm text-muted-foreground">
                {[load.destination_city, load.destination_state].filter(Boolean).join(", ")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Distance</div>
              <div className="font-medium">
                {load.distance_miles ? `${formatNumber(load.distance_miles, 0)} mi` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Equipment</div>
              <div className="font-medium">{load.equipment ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Pickup</div>
              <div className="font-medium">{load.pickup_date ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Delivery</div>
              <div className="font-medium">{load.delivery_date ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Commodity</div>
              <div className="font-medium">{load.commodity ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Weight</div>
              <div className="font-medium">
                {load.weight_lbs ? `${formatNumber(load.weight_lbs, 0)} lbs` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Target / load</div>
              <div className="font-medium">{formatMoney(load.target_price)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Loads</div>
              <div className="font-medium">
                {load.awarded_count} of {load.load_count} awarded
                {load.load_count - load.awarded_count > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({load.load_count - load.awarded_count} remaining)
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Hazmat / Temp</div>
              <div className="font-medium">
                {load.hazmat ? "Hazmat" : "—"}
                {load.temperature_controlled
                  ? ` · Reefer ${load.temperature_min ?? "?"}–${load.temperature_max ?? "?"}°F`
                  : ""}
              </div>
            </div>
          </div>
          {load.notes && (
            <div>
              <div className="text-xs uppercase text-muted-foreground">Notes</div>
              <div className="text-sm whitespace-pre-wrap">{load.notes}</div>
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Bid deadline</div>
            <div className="font-medium">
              {new Date(load.bid_deadline).toLocaleString()}
            </div>
            <div className="text-sm">
              <Countdown deadline={load.bid_deadline} />
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Bids</div>
            <div className="text-sm">
              {submittedBids.length} submitted · {bids.length} invited
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs uppercase text-muted-foreground">Workflow</div>
            {load.status === "awarded" && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => updateLoadStatus("in_transit")}
                disabled={statusUpdating}
              >
                Mark in transit
              </Button>
            )}
            {load.status === "in_transit" && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => updateLoadStatus("delivered")}
                disabled={statusUpdating}
              >
                Mark delivered
              </Button>
            )}
            {load.status === "delivered" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (awardedBid) {
                      setSelectedBid(awardedBid);
                      setRatingOpen(true);
                    }
                  }}
                  disabled={!awardedBid}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Rate carrier
                </Button>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => updateLoadStatus("completed")}
                  disabled={statusUpdating}
                >
                  Mark completed
                </Button>
              </>
            )}
            {!["completed", "cancelled"].includes(load.status) && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={cancelLoad}
                disabled={statusUpdating}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel load
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="bids">
        <TabsList>
          <TabsTrigger value="bids">Bids ({submittedBids.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({bids.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bids" className="mt-4">
          <Card className="p-0 overflow-hidden">
            {submittedBids.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No submitted bids yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price / load</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">$/mi</TableHead>
                      <TableHead className="text-right">Transit</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submittedBids.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          {b.ai_rank ? (
                            <Badge variant={b.ai_rank === 1 ? "default" : "outline"}>
                              #{b.ai_rank}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{b.carrier.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.carrier.primary_contact_name ?? ""}
                            {b.carrier.contact_email
                              ? ` · ${b.carrier.contact_email}`
                              : b.carrier.contact_phone
                              ? ` · ${b.carrier.contact_phone}`
                              : ""}
                          </div>
                          {b.ai_notes && (
                            <div className="text-xs text-muted-foreground italic mt-1">
                              {b.ai_notes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {b.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(b.price)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {b.price != null
                            ? formatMoney(Number(b.price) * b.quantity)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoney(b.price_per_mile)}
                        </TableCell>
                        <TableCell className="text-right">
                          {b.estimated_transit_days != null
                            ? `${b.estimated_transit_days}d`
                            : "—"}
                        </TableCell>
                        <TableCell>{b.available_date ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={bidStatusBadgeClass(b.status)}
                          >
                            {formatStatusLabel(b.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(["open", "partially_awarded"] as LoadStatus[]).includes(load.status) &&
                            b.status !== "awarded" && (() => {
                              const remaining = load.load_count - load.awarded_count;
                              const exceeds = b.quantity > remaining;
                              return (
                                <Button
                                  size="sm"
                                  disabled={exceeds}
                                  title={
                                    exceeds
                                      ? `Bid requests ${b.quantity} loads but only ${remaining} remain`
                                      : undefined
                                  }
                                  onClick={() => {
                                    setSelectedBid(b);
                                    setAwardOpen(true);
                                  }}
                                >
                                  <Trophy className="h-4 w-4 mr-1" />
                                  Award
                                </Button>
                              );
                            })()}
                          {b.status === "awarded" && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {b.quantity} awarded
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          <Card className="p-0 overflow-hidden">
            {bids.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No carriers invited.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Viewed</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Bid link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...submittedBids, ...otherBids].map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="font-medium">{b.carrier.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.carrier.contact_email ?? b.carrier.contact_phone ?? ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={bidStatusBadgeClass(b.status)}
                          >
                            {formatStatusLabel(b.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.viewed_at ? new Date(b.viewed_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.submitted_at ? new Date(b.submitted_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          {!deadlinePassed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyLink(b.bid_token)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copy link
                            </Button>
                          )}
                          {deadlinePassed && (
                            <span className="text-xs text-muted-foreground">Closed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
            <Send className="h-3.5 w-3.5" />
            Invite links open the carrier bid portal at <code>/bid/&lt;token&gt;</code> — no login required.
          </div>
        </TabsContent>
      </Tabs>

      <AwardModal
        bid={selectedBid}
        open={awardOpen}
        onOpenChange={setAwardOpen}
        onAwarded={refresh}
      />

      {selectedBid && (
        <RatingModal
          open={ratingOpen}
          onOpenChange={setRatingOpen}
          loadId={load.id}
          carrierId={selectedBid.carrier_id}
          carrierName={selectedBid.carrier.name}
          onSaved={refresh}
        />
      )}
    </div>
  );
};

export default LoadDetailPage;
