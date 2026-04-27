import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trophy, XCircle, CheckCircle2 } from "lucide-react";
import {
  adminBiddingClient,
  bidStatusBadgeClass,
  loadStatusBadgeClass,
  formatMoney,
  formatNumber,
  formatStatusLabel,
  type BidWithCarrier,
  type Load,
} from "@/lib/bidding";
import { toast } from "@/hooks/use-toast";

interface Props {
  loadId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

interface Shipper {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
}

export const BiddingLoadDetailDialog: React.FC<Props> = ({
  loadId,
  onClose,
  onChanged,
}) => {
  const [load, setLoad] = useState<Load | null>(null);
  const [shipper, setShipper] = useState<Shipper | null>(null);
  const [bids, setBids] = useState<BidWithCarrier[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!loadId) return;
    setLoading(true);
    try {
      const [{ load: l, shipper: sp }, b] = await Promise.all([
        adminBiddingClient.getLoad(loadId),
        adminBiddingClient.listBids(loadId),
      ]);
      setLoad(l);
      setShipper(sp);
      setBids(b);
    } catch (e) {
      toast({
        title: "Failed to load bidding details",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadId]);

  useEffect(() => {
    if (loadId) {
      fetchAll();
    } else {
      setLoad(null);
      setShipper(null);
      setBids([]);
    }
  }, [loadId, fetchAll]);

  const remaining = load ? Math.max(load.load_count - load.awarded_count, 0) : 0;

  const handleAward = async (bidId: string, bidQty: number) => {
    if (!load) return;
    if (bidQty > remaining) {
      toast({
        title: "Cannot award",
        description: `Bid is for ${bidQty} load${
          bidQty === 1 ? "" : "s"
        } but only ${remaining} remain.`,
        variant: "destructive",
      });
      return;
    }
    if (
      !confirm(
        `Award ${bidQty} load${bidQty === 1 ? "" : "s"} to this carrier?` +
          (bidQty === remaining
            ? " This fills the remaining capacity and declines all other pending bids."
            : "")
      )
    )
      return;
    setWorking(bidId);
    try {
      await adminBiddingClient.awardBid(bidId);
      toast({ title: "Bid awarded" });
      await fetchAll();
      onChanged?.();
    } catch (e) {
      toast({
        title: "Failed to award bid",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  };

  const handleCancel = async () => {
    if (!load) return;
    if (!confirm("Cancel this load on behalf of the shipper?")) return;
    setWorking("cancel");
    try {
      await adminBiddingClient.cancelLoad(load.id);
      toast({ title: "Load cancelled" });
      await fetchAll();
      onChanged?.();
    } catch (e) {
      toast({
        title: "Failed to cancel load",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  };

  const canAward =
    load != null && (load.status === "open" || load.status === "partially_awarded");
  const canCancel =
    load != null && !["completed", "cancelled"].includes(load.status);

  return (
    <Dialog open={loadId != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {load?.reference_code ?? "Load"}
            {load && (
              <Badge
                variant="outline"
                className={loadStatusBadgeClass(load.status)}
              >
                {formatStatusLabel(load.status)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading || !load ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-3">
                <div className="text-xs uppercase text-muted-foreground">
                  Shipper
                </div>
                <div className="font-medium">
                  {shipper?.company_name ?? "—"}
                </div>
                {shipper?.contact_name && (
                  <div className="text-sm text-muted-foreground">
                    {shipper.contact_name}
                  </div>
                )}
                {shipper?.phone && (
                  <div className="text-sm text-muted-foreground">
                    {shipper.phone}
                  </div>
                )}
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase text-muted-foreground">
                  Lane
                </div>
                <div className="font-medium">
                  {[load.origin_city, load.origin_state]
                    .filter(Boolean)
                    .join(", ") || load.origin_address}{" "}
                  →{" "}
                  {[load.destination_city, load.destination_state]
                    .filter(Boolean)
                    .join(", ") || load.destination_address}
                </div>
                <div className="text-sm text-muted-foreground">
                  {load.distance_miles
                    ? `${formatNumber(load.distance_miles, 0)} mi`
                    : "—"}
                  {load.equipment ? ` · ${load.equipment}` : ""}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs uppercase text-muted-foreground">
                  Loads awarded
                </div>
                <div className="font-medium">
                  {load.awarded_count} / {load.load_count}
                  {remaining > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({remaining} remaining)
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Deadline:{" "}
                  {new Date(load.bid_deadline).toLocaleString()}
                </div>
              </Card>
            </div>

            <Card className="p-0 overflow-hidden">
              {bids.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No bids yet.
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
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bids.map((b) => {
                        const exceeds = b.quantity > remaining;
                        return (
                          <TableRow key={b.id}>
                            <TableCell>
                              {b.ai_rank ? (
                                <Badge
                                  variant={
                                    b.ai_rank === 1 ? "default" : "outline"
                                  }
                                >
                                  #{b.ai_rank}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {b.carrier.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {b.carrier.contact_email ??
                                  b.carrier.contact_phone ??
                                  ""}
                              </div>
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
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={bidStatusBadgeClass(b.status)}
                              >
                                {formatStatusLabel(b.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {canAward && b.status !== "awarded" && (
                                <Button
                                  size="sm"
                                  disabled={working != null || exceeds}
                                  title={
                                    exceeds
                                      ? `Bid requests ${b.quantity} loads but only ${remaining} remain`
                                      : undefined
                                  }
                                  onClick={() =>
                                    handleAward(b.id, b.quantity)
                                  }
                                >
                                  {working === b.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                  ) : (
                                    <Trophy className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Award
                                </Button>
                              )}
                              {b.status === "awarded" && (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> {b.quantity}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={working != null}
                >
                  {working === "cancel" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Cancel load
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
