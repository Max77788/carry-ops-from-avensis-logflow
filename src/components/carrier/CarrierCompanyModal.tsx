import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Truck, UserCircle } from "lucide-react";
import { carrierService, Carrier } from "@/lib/carrierService";
import { CarrierCompanyInfoTab } from "./CarrierCompanyInfoTab";
import { CarrierFleetTab } from "./CarrierFleetTab";
import { CarrierDriversTab } from "./CarrierDriversTab";

interface CarrierCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrierId: string;
}

export const CarrierCompanyModal = ({
  open,
  onOpenChange,
  carrierId,
}: CarrierCompanyModalProps) => {
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (open && carrierId) {
      loadCarrier();
    }
  }, [open, carrierId]);

  const loadCarrier = async () => {
    setIsLoading(true);
    const data = await carrierService.getCarrierById(carrierId);
    setCarrier(data);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Company Settings</DialogTitle>
            <DialogDescription>Loading...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  if (!carrier) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Company Settings</DialogTitle>
            <DialogDescription>Company not found</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company Settings</DialogTitle>
          <DialogDescription>
            Manage your company information, fleet, and drivers
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Company Info</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Fleet</span>
              <span className="sm:hidden">Fleet</span>
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Drivers</span>
              <span className="sm:hidden">Drivers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <CarrierCompanyInfoTab carrier={carrier} onUpdate={loadCarrier} />
          </TabsContent>

          <TabsContent value="fleet" className="mt-4">
            <CarrierFleetTab carrierId={carrierId} />
          </TabsContent>

          <TabsContent value="drivers" className="mt-4">
            <CarrierDriversTab carrierId={carrierId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

