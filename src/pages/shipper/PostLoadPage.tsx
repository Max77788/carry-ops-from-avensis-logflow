import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, ArrowLeft, Truck, Search, Sparkles } from "lucide-react";
import { useShipperAuth } from "@/contexts/ShipperAuthContext";
import { biddingService, type CarrierCompany } from "@/lib/bidding";
import { toast } from "@/hooks/use-toast";

// Carriers come from public.companies (no per-carrier equipment_types).
const EQUIPMENT_TYPES = ["Van", "Reefer", "Flatbed", "Step Deck", "Tanker", "Hopper", "Other"];

// Single source of truth for the demo load. Used both as input placeholders
// and as the values applied by the "Fill with sample" button.
const SAMPLE_LOAD = {
  originAddress: "1500 Industrial Blvd",
  originCity: "Houston",
  originState: "TX",
  originLat: "29.7604",
  originLng: "-95.3698",
  destAddress: "2200 Commerce St",
  destCity: "Dallas",
  destState: "TX",
  destLat: "32.7767",
  destLng: "-96.7970",
  distanceMiles: "240",
  commodity: "Steel pipe",
  weightLbs: "44000",
  equipment: "Flatbed",
  pickupOffsetDays: 2,
  deliveryOffsetDays: 4,
  hazmat: false,
  tempControlled: false,
  tempMin: "34",
  tempMax: "38",
  targetPrice: "1850",
  bidDeadlineOffsetHours: 48,
  notes: "Tarps required. Driver assist on load.",
  loadCount: "10",
} as const;

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function localDatetimeOffset(hours: number): string {
  const d = new Date(Date.now() + hours * 3_600_000);
  // datetime-local expects "YYYY-MM-DDTHH:mm" in local time
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const PostLoadPage = () => {
  const navigate = useNavigate();
  const { user } = useShipperAuth();

  const [originAddress, setOriginAddress] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [originLat, setOriginLat] = useState("");
  const [originLng, setOriginLng] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destState, setDestState] = useState("");
  const [destLat, setDestLat] = useState("");
  const [destLng, setDestLng] = useState("");
  const [distanceMiles, setDistanceMiles] = useState("");
  const [commodity, setCommodity] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [equipment, setEquipment] = useState("Van");
  const [pickupDate, setPickupDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [hazmat, setHazmat] = useState(false);
  const [tempControlled, setTempControlled] = useState(false);
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [bidDeadline, setBidDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [loadCount, setLoadCount] = useState("1");

  const [carriers, setCarriers] = useState<CarrierCompany[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [carrierSearch, setCarrierSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCarriersLoading(true);
    biddingService
      .listCarriers(false)
      .then((rows) => {
        setCarriers(rows);
        // Pre-select active carriers only by default to avoid spamming Draft entries.
        setSelected(
          new Set(
            rows
              .filter((r) => (r.status ?? "").toLowerCase() === "active")
              .map((r) => r.id)
          )
        );
      })
      .catch((e) =>
        toast({
          title: "Failed to load carriers",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        })
      )
      .finally(() => setCarriersLoading(false));
  }, []);

  const visibleCarriers = useMemo(() => {
    let list = carriers;
    if (activeOnly) {
      list = list.filter((c) => (c.status ?? "").toLowerCase() === "active");
    }
    const s = carrierSearch.trim().toLowerCase();
    if (s) {
      list = list.filter((c) =>
        [c.name, c.primary_contact_name, c.contact_email, c.mc_number, c.dot_number, c.city, c.state]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      );
    }
    return list;
  }, [carriers, activeOnly, carrierSearch]);

  const toggleCarrier = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      visibleCarriers.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const fillSample = () => {
    setOriginAddress(SAMPLE_LOAD.originAddress);
    setOriginCity(SAMPLE_LOAD.originCity);
    setOriginState(SAMPLE_LOAD.originState);
    setOriginLat(SAMPLE_LOAD.originLat);
    setOriginLng(SAMPLE_LOAD.originLng);
    setDestAddress(SAMPLE_LOAD.destAddress);
    setDestCity(SAMPLE_LOAD.destCity);
    setDestState(SAMPLE_LOAD.destState);
    setDestLat(SAMPLE_LOAD.destLat);
    setDestLng(SAMPLE_LOAD.destLng);
    setDistanceMiles(SAMPLE_LOAD.distanceMiles);
    setCommodity(SAMPLE_LOAD.commodity);
    setWeightLbs(SAMPLE_LOAD.weightLbs);
    setEquipment(SAMPLE_LOAD.equipment);
    setPickupDate(isoDateOffset(SAMPLE_LOAD.pickupOffsetDays));
    setDeliveryDate(isoDateOffset(SAMPLE_LOAD.deliveryOffsetDays));
    setHazmat(SAMPLE_LOAD.hazmat);
    setTempControlled(SAMPLE_LOAD.tempControlled);
    setTempMin(SAMPLE_LOAD.tempMin);
    setTempMax(SAMPLE_LOAD.tempMax);
    setTargetPrice(SAMPLE_LOAD.targetPrice);
    setBidDeadline(localDatetimeOffset(SAMPLE_LOAD.bidDeadlineOffsetHours));
    setNotes(SAMPLE_LOAD.notes);
    setLoadCount(SAMPLE_LOAD.loadCount);
    toast({ title: "Form filled with sample data" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!bidDeadline) {
      toast({
        title: "Bid deadline required",
        variant: "destructive",
      });
      return;
    }
    if (new Date(bidDeadline) <= new Date()) {
      toast({
        title: "Bid deadline must be in the future",
        variant: "destructive",
      });
      return;
    }
    if (selected.size === 0) {
      toast({
        title: "Select at least one carrier to invite",
        variant: "destructive",
      });
      return;
    }
    const loadCountNum = Math.max(1, Math.floor(Number(loadCount) || 1));
    if (!Number.isFinite(loadCountNum) || loadCountNum < 1) {
      toast({
        title: "Number of loads must be a positive integer",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const load = await biddingService.createLoad({
        shipper_id: user.id,
        origin_address: originAddress.trim(),
        origin_city: originCity.trim() || null,
        origin_state: originState.trim() || null,
        origin_lat: originLat ? Number(originLat) : null,
        origin_lng: originLng ? Number(originLng) : null,
        destination_address: destAddress.trim(),
        destination_city: destCity.trim() || null,
        destination_state: destState.trim() || null,
        destination_lat: destLat ? Number(destLat) : null,
        destination_lng: destLng ? Number(destLng) : null,
        distance_miles: distanceMiles ? Number(distanceMiles) : null,
        commodity: commodity.trim() || null,
        weight_lbs: weightLbs ? Number(weightLbs) : null,
        equipment: equipment || null,
        pickup_date: pickupDate || null,
        delivery_date: deliveryDate || null,
        hazmat,
        temperature_controlled: tempControlled,
        temperature_min: tempControlled && tempMin ? Number(tempMin) : null,
        temperature_max: tempControlled && tempMax ? Number(tempMax) : null,
        target_price: targetPrice ? Number(targetPrice) : null,
        bid_deadline: new Date(bidDeadline).toISOString(),
        notes: notes.trim() || null,
        load_count: loadCountNum,
        // reference_code is auto-generated by trigger
        reference_code: undefined as never,
      } as never);

      const result = await biddingService.inviteCarriers(
        load.id,
        Array.from(selected)
      );

      toast({
        title: "Load posted",
        description: `${load.reference_code} created and ${result.invited.length} carriers invited.`,
      });
      navigate(`/shipper/loads/${load.id}`);
    } catch (err) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string };
      const description =
        (err instanceof Error && err.message) ||
        e?.message ||
        e?.details ||
        e?.hint ||
        (err ? JSON.stringify(err) : "Unknown error");
      console.error("Post load failed", err);
      toast({
        title: "Failed to post load",
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Post a load</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={fillSample}
        >
          <Sparkles className="h-4 w-4 mr-1" />
          Fill with sample
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Origin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="oa">Address</Label>
              <Input
                id="oa"
                placeholder={SAMPLE_LOAD.originAddress}
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oc">City</Label>
              <Input
                id="oc"
                placeholder={SAMPLE_LOAD.originCity}
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os">State</Label>
              <Input
                id="os"
                placeholder={SAMPLE_LOAD.originState}
                value={originState}
                onChange={(e) => setOriginState(e.target.value)}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="olat">Latitude</Label>
              <Input
                id="olat"
                type="number"
                step="any"
                placeholder={SAMPLE_LOAD.originLat}
                value={originLat}
                onChange={(e) => setOriginLat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="olng">Longitude</Label>
              <Input
                id="olng"
                type="number"
                step="any"
                placeholder={SAMPLE_LOAD.originLng}
                value={originLng}
                onChange={(e) => setOriginLng(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Destination</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="da">Address</Label>
              <Input
                id="da"
                placeholder={SAMPLE_LOAD.destAddress}
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dc">City</Label>
              <Input
                id="dc"
                placeholder={SAMPLE_LOAD.destCity}
                value={destCity}
                onChange={(e) => setDestCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds">State</Label>
              <Input
                id="ds"
                placeholder={SAMPLE_LOAD.destState}
                value={destState}
                onChange={(e) => setDestState(e.target.value)}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dlat">Latitude</Label>
              <Input
                id="dlat"
                type="number"
                step="any"
                placeholder={SAMPLE_LOAD.destLat}
                value={destLat}
                onChange={(e) => setDestLat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dlng">Longitude</Label>
              <Input
                id="dlng"
                type="number"
                step="any"
                placeholder={SAMPLE_LOAD.destLng}
                value={destLng}
                onChange={(e) => setDestLng(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: provide lat/lng on both ends and we'll auto-compute the great-circle distance.
          </p>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="dist">Distance (miles, optional)</Label>
            <Input
              id="dist"
              type="number"
              min="0"
              step="0.1"
              placeholder={SAMPLE_LOAD.distanceMiles}
              value={distanceMiles}
              onChange={(e) => setDistanceMiles(e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Freight</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="commodity">Commodity</Label>
              <Input
                id="commodity"
                placeholder={SAMPLE_LOAD.commodity}
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                placeholder={SAMPLE_LOAD.weightLbs}
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Select value={equipment} onValueChange={setEquipment}>
                <SelectTrigger id="equipment"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup">Pickup date</Label>
              <Input id="pickup" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery">Delivery date</Label>
              <Input id="delivery" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target price (USD)</Label>
              <Input
                id="target"
                type="number"
                min="0"
                step="0.01"
                placeholder={SAMPLE_LOAD.targetPrice}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={hazmat} onCheckedChange={(v) => setHazmat(Boolean(v))} />
              <span>Hazmat</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={tempControlled} onCheckedChange={(v) => setTempControlled(Boolean(v))} />
              <span>Temperature controlled</span>
            </label>
          </div>

          {tempControlled && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="tmin">Min °F</Label>
                <Input
                  id="tmin"
                  type="number"
                  step="0.1"
                  placeholder={SAMPLE_LOAD.tempMin}
                  value={tempMin}
                  onChange={(e) => setTempMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmax">Max °F</Label>
                <Input
                  id="tmax"
                  type="number"
                  step="0.1"
                  placeholder={SAMPLE_LOAD.tempMax}
                  value={tempMax}
                  onChange={(e) => setTempMax(e.target.value)}
                />
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Bidding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
            <div className="space-y-2">
              <Label htmlFor="deadline">Bid deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={bidDeadline}
                onChange={(e) => setBidDeadline(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="load-count">Number of loads</Label>
              <Input
                id="load-count"
                type="number"
                min="1"
                step="1"
                placeholder={SAMPLE_LOAD.loadCount}
                value={loadCount}
                onChange={(e) => setLoadCount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Carriers can bid on any subset (e.g. 10 loads total — one carrier
                takes 6, another takes 4). Bidding stays open until the full
                count is awarded.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes for carriers</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder={SAMPLE_LOAD.notes}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Invite carriers
            </h2>
            <div className="text-sm text-muted-foreground">
              {selected.size} of {carriers.length} carriers selected
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search carriers by name, MC/DOT, contact..."
                className="pl-9"
                value={carrierSearch}
                onChange={(e) => setCarrierSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={activeOnly}
                onCheckedChange={(v) => setActiveOnly(Boolean(v))}
              />
              <span>Active carriers only</span>
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                Select all shown
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </div>

          {carriersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : carriers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No carriers in the company directory yet. Add carriers via the
              admin company onboarding flow first.
            </div>
          ) : visibleCarriers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No carriers match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
              {visibleCarriers.map((c) => (
                <label
                  key={c.id}
                  className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleCarrier(c.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.primary_contact_name ?? "—"}
                      {c.contact_email ? ` · ${c.contact_email}` : c.contact_phone ? ` · ${c.contact_phone}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      MC {c.mc_number || "—"} · DOT {c.dot_number || "—"}
                      {c.city || c.state ? ` · ${[c.city, c.state].filter(Boolean).join(", ")}` : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Post load &amp; send invites
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PostLoadPage;
