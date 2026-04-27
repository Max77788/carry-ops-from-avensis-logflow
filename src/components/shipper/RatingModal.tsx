import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Star } from "lucide-react";
import { biddingService } from "@/lib/bidding";
import { useShipperAuth } from "@/contexts/ShipperAuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadId: string;
  carrierId: string;
  carrierName: string;
  onSaved?: () => void;
}

const StarRow: React.FC<{
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <Label>{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1"
          aria-label={`${n} stars`}
        >
          <Star
            className={`h-5 w-5 ${
              value !== null && n <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  </div>
);

export const RatingModal: React.FC<Props> = ({
  open,
  onOpenChange,
  loadId,
  carrierId,
  carrierName,
  onSaved,
}) => {
  const { user } = useShipperAuth();
  const [overall, setOverall] = useState<number>(5);
  const [communication, setCommunication] = useState<number | null>(null);
  const [timeliness, setTimeliness] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    biddingService
      .getRatingForLoad(loadId)
      .then((existing) => {
        if (existing) {
          setOverall(existing.rating_overall);
          setCommunication(existing.rating_communication);
          setTimeliness(existing.rating_timeliness);
          setCondition(existing.rating_condition);
          setComment(existing.comment ?? "");
        } else {
          setOverall(5);
          setCommunication(null);
          setTimeliness(null);
          setCondition(null);
          setComment("");
        }
      })
      .catch((e) =>
        toast({
          title: "Could not load rating",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        })
      )
      .finally(() => setLoading(false));
  }, [open, loadId]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await biddingService.upsertRating({
        load_id: loadId,
        carrier_id: carrierId,
        shipper_id: user.id,
        rating_overall: overall,
        rating_communication: communication,
        rating_timeliness: timeliness,
        rating_condition: condition,
        comment: comment.trim() || null,
      });
      toast({ title: "Rating saved" });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Failed to save rating",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {carrierName}</DialogTitle>
          <DialogDescription>
            How did they do on this load? Ratings help you and the platform
            surface the best carriers for future loads.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <StarRow label="Overall" value={overall} onChange={setOverall} />
            <StarRow label="Communication" value={communication} onChange={setCommunication} />
            <StarRow label="Timeliness" value={timeliness} onChange={setTimeliness} />
            <StarRow label="Load condition" value={condition} onChange={setCondition} />
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
