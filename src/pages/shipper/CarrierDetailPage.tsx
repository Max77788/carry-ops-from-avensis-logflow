import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { biddingService, type CarrierCompany } from "@/lib/bidding";
import { toast } from "@/hooks/use-toast";

const CarrierDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState<CarrierCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    biddingService
      .getCarrier(id)
      .then(setCarrier)
      .catch((e) =>
        toast({
          title: "Failed to load carrier",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        })
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Card className="p-8 text-center text-muted-foreground">
          Carrier not found.
        </Card>
      </div>
    );
  }

  const statusActive = (carrier.status ?? "").toLowerCase() === "active";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{carrier.name}</h1>
        <Badge variant={statusActive ? "default" : "outline"}>
          {carrier.status ?? "—"}
        </Badge>
      </div>

      <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Contact</div>
          <div className="font-medium">{carrier.primary_contact_name ?? "—"}</div>
          <div className="text-sm">{carrier.contact_email ?? "—"}</div>
          <div className="text-sm">{carrier.contact_phone ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">MC / DOT</div>
          <div className="font-medium">
            {(carrier.mc_number || "—") + " / " + (carrier.dot_number || "—")}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Location</div>
          <div className="font-medium">
            {[carrier.city, carrier.state].filter(Boolean).join(", ") || "—"}
          </div>
          {carrier.business_address && (
            <div className="text-sm text-muted-foreground">{carrier.business_address}</div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Onboarding</div>
          <div className="text-sm">
            Approval: {carrier.approval_status ? "Approved" : "Pending"}
          </div>
          <div className="text-sm">
            Portal access: {carrier.portal_access_enabled ? "Enabled" : "Disabled"}
          </div>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Carrier records are managed in the company directory. To update contact
        info, MC/DOT or status, edit the carrier from the admin company detail
        page.
      </p>
    </div>
  );
};

export default CarrierDetailPage;
