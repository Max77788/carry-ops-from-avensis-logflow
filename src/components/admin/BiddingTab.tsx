import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  RefreshCw,
  Gavel,
  Eye,
  Loader2,
  Building2,
  DollarSign,
  Inbox,
} from "lucide-react";
import {
  adminBiddingClient,
  formatMoney,
  formatStatusLabel,
  loadStatusBadgeClass,
  type AdminLoadRow,
  type AdminShipperRow,
  type AdminBiddingStats,
  type LoadStatus,
} from "@/lib/bidding";
import { toast } from "@/hooks/use-toast";
import { BiddingLoadDetailDialog } from "./BiddingLoadDetailDialog";

const LOAD_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "partially_awarded", label: "Partially Awarded" },
  { value: "awarded", label: "Awarded" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const BiddingTab = () => {
  const [loads, setLoads] = useState<AdminLoadRow[]>([]);
  const [shippers, setShippers] = useState<AdminShipperRow[]>([]);
  const [stats, setStats] = useState<AdminBiddingStats | null>(null);

  const [loadingLoads, setLoadingLoads] = useState(false);
  const [loadingShippers, setLoadingShippers] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shipperFilter, setShipperFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoadingLoads(true);
    setLoadingShippers(true);
    try {
      const [ls, sp, st] = await Promise.all([
        adminBiddingClient.listLoads({
          status:
            statusFilter === "all" ? undefined : (statusFilter as LoadStatus),
          shipper_id: shipperFilter === "all" ? undefined : shipperFilter,
        }),
        adminBiddingClient.listShippers(),
        adminBiddingClient.stats(),
      ]);
      setLoads(ls);
      setShippers(sp);
      setStats(st);
    } catch (e) {
      toast({
        title: "Failed to load bidding data",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoadingLoads(false);
      setLoadingShippers(false);
    }
  }, [statusFilter, shipperFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredLoads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return loads;
    return loads.filter((l) =>
      [
        l.reference_code,
        l.shipper_company_name,
        l.origin_city,
        l.origin_state,
        l.destination_city,
        l.destination_state,
        l.commodity,
        l.equipment,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [loads, search]);

  const refresh = () => fetchAll();

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Inbox className="h-4 w-4" />}
          label="Total Loads"
          value={stats?.total_loads ?? "—"}
        />
        <StatCard
          icon={<Gavel className="h-4 w-4" />}
          label="Open Loads"
          value={stats?.open_loads ?? "—"}
          tone="sky"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Bids"
          value={stats?.total_bids ?? "—"}
        />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="Shippers"
          value={stats?.total_shippers ?? "—"}
        />
      </div>

      <Tabs defaultValue="loads">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="loads" className="gap-2">
              <Gavel className="h-4 w-4" /> Loads
            </TabsTrigger>
            <TabsTrigger value="shippers" className="gap-2">
              <Building2 className="h-4 w-4" /> Shippers
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loadingLoads || loadingShippers ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>

        {/* LOADS */}
        <TabsContent value="loads" className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, shipper, lane, commodity…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOAD_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={shipperFilter} onValueChange={setShipperFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Shipper" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shippers</SelectItem>
                {shippers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Shipper</TableHead>
                    <TableHead>Lane</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Loads</TableHead>
                    <TableHead className="text-right">Bids</TableHead>
                    <TableHead className="text-right">Lowest</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLoads ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin inline-block text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredLoads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No loads match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLoads.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-sm">
                          {l.reference_code}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {l.shipper_company_name ?? "—"}
                          </div>
                          {l.shipper_contact_name && (
                            <div className="text-xs text-muted-foreground">
                              {l.shipper_contact_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {[l.origin_city, l.origin_state]
                              .filter(Boolean)
                              .join(", ") || l.origin_address}{" "}
                            →{" "}
                            {[l.destination_city, l.destination_state]
                              .filter(Boolean)
                              .join(", ") || l.destination_address}
                          </div>
                          {l.distance_miles != null && (
                            <div className="text-xs text-muted-foreground">
                              {Math.round(Number(l.distance_miles))} mi
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {l.pickup_date ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {l.equipment ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={loadStatusBadgeClass(l.status)}
                          >
                            {formatStatusLabel(l.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          <span className="font-medium">{l.awarded_count}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {l.load_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          <span className="font-medium">
                            {l.submitted_bids}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            / {l.total_bids}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatMoney(l.lowest_price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setSelectedLoadId(l.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* SHIPPERS */}
        <TabsContent value="shippers" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Loads</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingShippers ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin inline-block text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : shippers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                      >
                        No shippers have signed up yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shippers.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.company_name}
                        </TableCell>
                        <TableCell>{s.contact_name ?? "—"}</TableCell>
                        <TableCell>{s.phone ?? "—"}</TableCell>
                        <TableCell>
                          {new Date(s.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.load_count_total}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.load_count_open}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <BiddingLoadDetailDialog
        loadId={selectedLoadId}
        onClose={() => setSelectedLoadId(null)}
        onChanged={refresh}
      />
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: "slate" | "sky";
}) {
  const toneClass =
    tone === "sky"
      ? "text-sky-600 bg-sky-500/10"
      : "text-muted-foreground bg-muted";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneClass}`}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold leading-tight">{value}</div>
        </div>
      </div>
    </Card>
  );
}

