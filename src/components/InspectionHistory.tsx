import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Calendar, Truck, Loader2 } from "lucide-react";
import { truckInspectionService } from "@/lib/truckInspectionService";

interface InspectionHistoryProps {
  driverId?: string;
  truckId?: string;
  limit?: number;
}

interface InspectionItem {
  id: string;
  inspection_date: string;
  completed_at: string | null;
  report_url: string | null;
  truck_id: string;
  driver_id: string | null;
  truck?: { truck_id: string; license_plate: string | null };
}

export const InspectionHistory = ({
  driverId,
  truckId,
  limit = 10,
}: InspectionHistoryProps) => {
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInspections = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await truckInspectionService.getInspectionHistory(
          driverId,
          truckId,
          limit
        );
        if (result.success && result.data) {
          setInspections(result.data);
        } else {
          setError(result.error || "Failed to load inspections");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load inspections");
      } finally {
        setIsLoading(false);
      }
    };

    loadInspections();
  }, [driverId, truckId, limit]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (dateString: string) => {
    const today = new Date().toDateString();
    const inspectionDate = new Date(dateString).toDateString();
    return today === inspectionDate;
  };

  // Filter to only show completed inspections
  const completedInspections = inspections.filter((i) => i.completed_at !== null);
  const hasInspections = completedInspections.length > 0;

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="text-center py-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </Card>
    );
  }

  if (!hasInspections) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Inspection Reports</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            No inspection reports available yet. Reports will appear here after completing inspections.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Inspection Reports</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Access your inspection reports to show DOT officers. Reports are valid for 24 hours from the inspection date.
      </p>

      <div className="space-y-3">
        {completedInspections.map((inspection) => (
          <div
            key={inspection.id}
            className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  {formatDate(inspection.inspection_date)}
                </span>
                {isToday(inspection.inspection_date) && (
                  <Badge variant="secondary" className="text-xs">
                    Today
                  </Badge>
                )}
              </div>
              {inspection.truck && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-3 w-3 flex-shrink-0" />
                  <span>
                    Truck {inspection.truck.truck_id}
                    {inspection.truck.license_plate
                      ? ` (${inspection.truck.license_plate})`
                      : ""}
                  </span>
                </div>
              )}
            </div>
            {inspection.report_url ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(inspection.report_url!, "_blank");
                }}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
                View Report
              </Button>
            ) : (
              <Badge variant="secondary" className="flex-shrink-0">
                Report Pending
              </Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
