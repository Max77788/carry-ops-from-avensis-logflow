import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { carrierService, Truck, Driver } from "@/lib/carrierService";
import { supabase } from "@/lib/supabase";

interface CompanyFleetTabProps {
  companyId: string;
}

interface TruckWithIssues extends Truck {
  hasIssues?: boolean;
  compliance_status?: string;
}

export const CompanyFleetTab = ({ companyId }: CompanyFleetTabProps) => {
  const [trucks, setTrucks] = useState<TruckWithIssues[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFleetData();
  }, [companyId]);

  const loadFleetData = async () => {
    setIsLoading(true);
    const [trucksData, driversData] = await Promise.all([
      carrierService.getTrucksByCarrier(companyId),
      carrierService.getDriversByCarrier(companyId),
    ]);

    // Check for inspection issues for each truck
    const trucksWithIssues = await Promise.all(
      trucksData.map(async (truck) => {
        // Get latest inspection for this truck
        const { data: latestInspection } = await supabase
          .from("truck_daily_inspections")
          .select("id, inspection_date")
          .eq("truck_id", truck.id)
          .order("inspection_date", { ascending: false })
          .limit(1)
          .single();

        let hasIssues = false;
        if (latestInspection) {
          // Count "not_working" items
          const { count } = await supabase
            .from("truck_inspection_item_status")
            .select("*", { count: "exact", head: true })
            .eq("inspection_id", latestInspection.id)
            .eq("status", "not_working");

          hasIssues = (count || 0) > 0;
        }

        // Also check compliance_status from the truck record
        const { data: truckData } = await supabase
          .from("trucks")
          .select("compliance_status")
          .eq("id", truck.id)
          .single();

        return {
          ...truck,
          hasIssues,
          compliance_status: truckData?.compliance_status || null,
        };
      })
    );

    setTrucks(trucksWithIssues);
    setDrivers(driversData);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Trucks */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Trucks ({trucks.length})</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck ID</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : trucks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No trucks found
                  </TableCell>
                </TableRow>
              ) : (
                trucks.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">
                      {truck.truck_id}
                    </TableCell>
                    <TableCell>{(truck as any).license_plate || "-"}</TableCell>
                    <TableCell>{(truck as any).license_state || "-"}</TableCell>
                    <TableCell>{(truck as any).truck_type || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {(truck as any).vin || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          truck.hasIssues || truck.compliance_status === "restricted"
                            ? "bg-red-500"
                            : truck.status === "active"
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }
                      >
                        {truck.hasIssues || truck.compliance_status === "restricted"
                          ? "restricted"
                          : truck.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(truck.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drivers */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Drivers ({drivers.length})
        </h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>CDL Number</TableHead>
                <TableHead>CDL State</TableHead>
                <TableHead>Driver Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No drivers found
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.email || "-"}</TableCell>
                    <TableCell>{(driver as any).phone || "-"}</TableCell>
                    <TableCell>{(driver as any).cdl_number || "-"}</TableCell>
                    <TableCell>{(driver as any).cdl_state || "-"}</TableCell>
                    <TableCell>{(driver as any).driver_type || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          driver.status === "active"
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }
                      >
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(driver.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
