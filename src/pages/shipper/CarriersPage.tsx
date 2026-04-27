import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Truck } from "lucide-react";
import { biddingService, type CarrierCompany } from "@/lib/bidding";
import { toast } from "@/hooks/use-toast";

type StatusFilter = "all" | "active";

const CarriersPage = () => {
  const [rows, setRows] = useState<CarrierCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    setLoading(true);
    biddingService
      .listCarriers(false)
      .then(setRows)
      .catch((e) =>
        toast({
          title: "Failed to load carriers",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "active") {
      list = list.filter((c) => (c.status ?? "").toLowerCase() === "active");
    }
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((c) =>
      [c.name, c.primary_contact_name, c.contact_email, c.mc_number, c.dot_number, c.city, c.state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [rows, search, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Carrier directory</h1>
          <p className="text-muted-foreground text-sm">
            Carriers from your company directory. Invite any of them to bid when posting a load.
            To add or edit a carrier, use the admin onboarding flow.
          </p>
        </div>
      </div>

      <Card className="p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, contact, MC/DOT, city..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
            <TabsTrigger value="active">
              Active (
              {rows.filter((c) => (c.status ?? "").toLowerCase() === "active").length}
              )
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              {rows.length === 0
                ? "No carriers in the directory yet."
                : "No carriers match your filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>MC / DOT</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/shipper/carriers/${c.id}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{c.primary_contact_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.contact_email ?? c.contact_phone ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.mc_number || "—"} / {c.dot_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (c.status ?? "").toLowerCase() === "active"
                            ? "default"
                            : "outline"
                        }
                      >
                        {c.status ?? "—"}
                      </Badge>
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

export default CarriersPage;
