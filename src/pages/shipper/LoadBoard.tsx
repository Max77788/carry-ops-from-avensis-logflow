import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Loader2,
  Search,
  MapPin,
  Calendar,
  Inbox,
} from "lucide-react";
import {
  biddingService,
  loadStatusBadgeClass,
  formatStatusLabel,
  formatMoney,
  type LoadSummary,
} from "@/lib/bidding";
import { toast } from "@/hooks/use-toast";

const LoadBoard = () => {
  const navigate = useNavigate();
  const [loads, setLoads] = useState<LoadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    biddingService
      .listLoads()
      .then((rows) => {
        if (active) setLoads(rows);
      })
      .catch((e) => {
        toast({
          title: "Failed to load",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return loads;
    return loads.filter((l) =>
      [
        l.reference_code,
        l.origin_city,
        l.destination_city,
        l.commodity,
        l.equipment,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(s))
    );
  }, [loads, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Load Board</h1>
          <p className="text-muted-foreground text-sm">
            Track every load you've posted and the bids you've received.
          </p>
        </div>
        <Button onClick={() => navigate("/shipper/loads/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Post a load
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ref, city, commodity..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              {loads.length === 0
                ? "You haven't posted any loads yet."
                : "No loads match your search."}
            </p>
            {loads.length === 0 && (
              <Button
                className="mt-4"
                onClick={() => navigate("/shipper/loads/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Post your first load
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Lane</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Loads</TableHead>
                  <TableHead className="text-right">Bids</TableHead>
                  <TableHead className="text-right">Lowest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/shipper/loads/${l.id}`)}
                  >
                    <TableCell className="font-medium">
                      <Link
                        to={`/shipper/loads/${l.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {l.reference_code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {[l.origin_city, l.origin_state].filter(Boolean).join(", ") ||
                            l.origin_address}
                        </span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span>
                          {[l.destination_city, l.destination_state]
                            .filter(Boolean)
                            .join(", ") || l.destination_address}
                        </span>
                      </div>
                      {l.distance_miles ? (
                        <div className="text-xs text-muted-foreground">
                          {Number(l.distance_miles).toLocaleString()} mi
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {l.pickup_date ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>{l.equipment ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={loadStatusBadgeClass(l.status)}
                      >
                        {formatStatusLabel(l.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm">
                        <span className="font-medium">{l.awarded_count}</span>
                        <span className="text-muted-foreground"> / {l.load_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm">
                        <span className="font-medium">{l.submitted_bids}</span>
                        <span className="text-muted-foreground"> / {l.total_bids}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(l.lowest_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LoadBoard;
