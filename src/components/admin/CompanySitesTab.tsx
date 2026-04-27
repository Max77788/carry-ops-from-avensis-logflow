import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Building } from "lucide-react";
import { adminService, DestinationSite, PickupSite } from "@/lib/adminService";

interface CompanySitesTabProps {
  companyId: string;
}

export const CompanySitesTab = ({ companyId }: CompanySitesTabProps) => {
  const [destinationSites, setDestinationSites] = useState<DestinationSite[]>([]);
  const [pickupSites, setPickupSites] = useState<PickupSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSites();
  }, [companyId]);

  const loadSites = async () => {
    setIsLoading(true);
    const [destData, pickupData] = await Promise.all([
      adminService.getDestinationSitesByCompany(companyId),
      adminService.getPickupSitesByCompany(companyId),
    ]);
    setDestinationSites(destData);
    setPickupSites(pickupData);
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="destination">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="destination" className="gap-2">
            <Building className="h-4 w-4" />
            Destination Sites
          </TabsTrigger>
          <TabsTrigger value="pickup" className="gap-2">
            <MapPin className="h-4 w-4" />
            Pickup Sites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="destination" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : destinationSites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      No destination sites found
                    </TableCell>
                  </TableRow>
                ) : (
                  destinationSites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.address || "-"}</TableCell>
                      <TableCell>{site.city || "-"}</TableCell>
                      <TableCell>{site.state || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pickup" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>GPS Location</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : pickupSites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      No pickup sites found
                    </TableCell>
                  </TableRow>
                ) : (
                  pickupSites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.gps_location || "-"}</TableCell>
                      <TableCell>{site.address || "-"}</TableCell>
                      <TableCell>{site.description || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

