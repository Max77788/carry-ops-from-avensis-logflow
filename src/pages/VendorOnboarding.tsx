import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignaturePad } from "@/components/SignaturePad";
import { Header } from "@/components/Header";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressInput } from "@/components/AddressInput";
import {
  Building2,
  Users,
  Truck,
  UserCircle,
  Shield,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { useAuth } from "@/contexts/AuthContext";
import { APP_TITLE, CONTRACT_WEBHOOK_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";

interface VendorFormData {
  // Company Details
  vendor_company_name: string;
  business_address: string;
  city: string;
  state: string;
  zip: string;
  legal_name_for_invoicing: string;
  mailing_address_optional: string;
  mc_number: string;
  dot_number: string;
  upload_coi: File | null;
  upload_w9: File | null;

  // Contacts
  company_name: string;
  primary_contact_name: string;
  contact_phone: string;
  contact_email: string;
  location: string;
  role: string;
  comments: string;

  // Fleet Details
  truck_id: string;
  carrier_name: string;
  license_plate: string;
  license_state: string;
  truck_type: string;
  capacity: string;
  gps_device_id: string;
  material_types_handled: string[];
  vin: string;
  is_on_insurance_policy: string;

  // Driver Details
  driver_name: string;
  phone_number: string;
  email_address: string;
  cdl_number: string;
  cdl_state: string;
  driver_type: string;
  operating_hours: string;
  weekend_availability: string;
  driver_comments: string;
  emergency_contact: string;

  // Trailer Details
  trailer_id: string;
  trailer_vin: string;
  trailer_make: string;
  trailer_model: string;
  trailer_year: string;
  trailer_is_on_insurance_policy: string;
}

const VendorOnboarding = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("company_details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signature, setSignature] = useState<string>("");
  const [signerName, setSignerName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fleetCsvInputRef = useRef<HTMLInputElement>(null);
  const driverCsvInputRef = useRef<HTMLInputElement>(null);

  // Track completed tabs
  const [completedTabs, setCompletedTabs] = useState<string[]>([
    "company_details",
  ]);

  // CSV upload state
  const [fleetCsvData, setFleetCsvData] = useState<any[]>([]);
  const [trailerCsvData, setTrailerCsvData] = useState<any[]>([]);
  const [driverCsvData, setDriverCsvData] = useState<any[]>([]);

  // Additional contacts state
  const [additionalContacts, setAdditionalContacts] = useState<any[]>([]);

  // Additional trucks state
  const [additionalTrucks, setAdditionalTrucks] = useState<any[]>([]);

  // Additional drivers state
  const [additionalDrivers, setAdditionalDrivers] = useState<any[]>([]);

  // Additional trailers state
  const [additionalTrailers, setAdditionalTrailers] = useState<any[]>([]);

  // Initial contract acceptance state (must accept before accessing form)
  const [initialContractAccepted, setInitialContractAccepted] = useState(false);
  const [hasAgreedToInitialContract, setHasAgreedToInitialContract] =
    useState(false);

  // Final contract acceptance state (on compliance tab)
  const [finalContractAccepted, setFinalContractAccepted] = useState(false);

  // Mailing address toggle state
  const [showMailingAddress, setShowMailingAddress] = useState(false);

  // Success state
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Data loading state to prevent agreement screen flash
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Track if contacts were pre-loaded from database
  const [hasPreloadedContacts, setHasPreloadedContacts] = useState(false);

  // Check authentication and onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!authLoading && !user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access the vendor onboarding portal",
          variant: "destructive",
        });
        navigate("/vendor/login");
        return;
      }

      // Check if vendor has already completed onboarding
      if (user?.id) {
        const { data: company } = await supabase
          .from("companies")
          .select("*")
          .eq("id", user.id)
          .single();

        if (company) {
          // Check if company is suspended
          if (company.status === "Suspended") {
            toast({
              title: "Access Suspended",
              description:
                "Your account has been suspended. Please contact your administrator.",
              variant: "destructive",
            });
            navigate("/vendor/login");
            return;
          }

          // Allow access for onboarding statuses even if portal_access_enabled is false
          const isOnboardingStatus =
            company.status === "Onboarding Invited" ||
            company.status === "Onboarding In Progress";

          // Check if portal access is disabled (but allow onboarding statuses)
          if (!company.portal_access_enabled && !isOnboardingStatus) {
            toast({
              title: "Access Disabled",
              description:
                "Portal access is currently disabled. Please contact your administrator.",
              variant: "destructive",
            });
            navigate("/vendor/login");
            return;
          }

          // Check if vendor has filled in basic company info (has onboarded)
          const hasOnboarded =
            company.business_address && company.mc_number && company.dot_number;

          if (hasOnboarded && company.status === "Active") {
            // Redirect to profile page if fully onboarded and active
            navigate("/vendor/profile");
          } else {
            // Update status to "Onboarding In Progress" if not already set
            if (
              company.status === "Onboarding Invited" ||
              company.status === "Draft"
            ) {
              await supabase
                .from("companies")
                .update({ status: "Onboarding In Progress" } as any)
                .eq("id", user.id);
            }
          }
        }
      }
    };

    checkOnboardingStatus();
  }, [user, authLoading, navigate]);

  // Prefill form data from existing company record and determine last checkpoint
  useEffect(() => {
    const prefillFormData = async () => {
      if (!user?.id) {
        setIsDataLoading(false);
        return;
      }

      setIsDataLoading(true);

      try {
        const { data: company, error } = await supabase
          .from("companies")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching company data:", error);
          setIsDataLoading(false);
          return;
        }

        if (company) {
          // Prefill company details
          setFormData((prev) => ({
            ...prev,
            vendor_company_name: company.name || "",
            business_address: company.business_address || "",
            city: company.city || "",
            state: company.state || "",
            zip: company.zip || "",
            legal_name_for_invoicing: company.legal_name_for_invoicing || "",
            mailing_address_optional: company.mailing_address || "",
            mc_number: company.mc_number || "",
            dot_number: company.dot_number || "",
          }));

          // Check if mailing address exists to show the field
          if (company.mailing_address) {
            setShowMailingAddress(true);
          }

          // Check if agreement was already accepted
          if (company.agreement_status === "Accepted") {
            setHasAgreedToInitialContract(true);
            setFinalContractAccepted(true); // Also set final contract as accepted
          }

          // Determine last checkpoint and resume from there
          const completedTabsList: string[] = ["company_details"];
          let lastCompletedTab = "company_details";

          // Check company_details completion
          if (company.company_details_status === "Complete") {
            completedTabsList.push("contacts");
            lastCompletedTab = "contacts";
          }

          // Check contacts completion
          if (company.contacts_status === "Complete") {
            completedTabsList.push("fleet_details");
            lastCompletedTab = "fleet_details";
          }

          // Check fleet completion
          if (company.fleet_status === "Complete") {
            completedTabsList.push("trailer_details");
            lastCompletedTab = "trailer_details";
          }

          // Check trailers completion
          if (company.trailers_status === "Complete") {
            completedTabsList.push("driver_details");
            lastCompletedTab = "driver_details";
          }

          // Set completed tabs and active tab to last checkpoint
          setCompletedTabs(completedTabsList);
          setActiveTab(lastCompletedTab);

          console.log("Resuming from checkpoint:", lastCompletedTab);
          console.log("Completed tabs:", completedTabsList);

          // Load existing contacts
          const { data: contacts } = await supabase
            .from("Contact_Info")
            .select("*")
            .eq("company_id", user.id);

          if (contacts && contacts.length > 0) {
            // Set flag to show info banner
            setHasPreloadedContacts(true);

            console.log("Loaded contacts:", contacts);
            console.log(
              "Contacts with is_primary flag:",
              contacts.map((c) => ({
                id: c.id,
                name: c.Contact_Name,
                is_primary: c.is_primary,
              }))
            );

            // Find primary contact, or use first contact if none marked as primary
            let primaryContact = contacts.find((c) => c.is_primary);

            // Check if there are multiple primary contacts (data integrity issue)
            const primaryContacts = contacts.filter((c) => c.is_primary);
            if (primaryContacts.length > 1) {
              console.warn(
                "Multiple primary contacts found! Fixing by keeping only the first one."
              );

              // Unset all as primary first
              await supabase
                .from("Contact_Info")
                .update({ is_primary: false })
                .eq("company_id", user.id);

              // Set only the first one as primary
              primaryContact = primaryContacts[0];
              await supabase
                .from("Contact_Info")
                .update({ is_primary: true })
                .eq("id", primaryContact.id);

              console.log(
                "Fixed: Set only first contact as primary:",
                primaryContact.id
              );
            }

            // If no contact is marked as primary, use the first contact and mark it as primary
            if (!primaryContact && contacts.length > 0) {
              console.log(
                "No primary contact found, using first contact as primary"
              );
              primaryContact = contacts[0];

              // Update the database to mark this contact as primary
              const { error: updateError } = await supabase
                .from("Contact_Info")
                .update({ is_primary: true })
                .eq("id", primaryContact.id);

              if (updateError) {
                console.error("Error marking contact as primary:", updateError);
              } else {
                console.log(
                  "Successfully marked contact as primary:",
                  primaryContact.id
                );
              }
            } else {
              console.log("Found primary contact:", primaryContact);
            }

            if (primaryContact) {
              setFormData((prev) => ({
                ...prev,
                primary_contact_name: primaryContact.Contact_Name || "",
                contact_email: primaryContact.Contact_Email || "",
                contact_phone: primaryContact.Contact_Phone || "",
                location: primaryContact.Location || "",
                role: primaryContact.Role || "",
                comments: primaryContact.Notes || "",
              }));
            }

            // Load additional contacts (non-primary) - exclude the primary contact by ID
            const additionalContactsData = contacts
              .filter((c) => c.id !== primaryContact?.id)
              .map((c) => ({
                id: c.id,
                name: c.Contact_Name || "",
                email: c.Contact_Email || "",
                phone: c.Contact_Phone || "",
                location: c.Location || "",
                role: c.Role || "",
                comments: c.Notes || "",
              }));
            setAdditionalContacts(additionalContactsData);

            console.log("Primary contact loaded into form:", {
              name: primaryContact?.Contact_Name,
              email: primaryContact?.Contact_Email,
              phone: primaryContact?.Contact_Phone,
            });
            console.log("Additional contacts:", additionalContactsData.length);
          }

          // Load existing trucks
          const { data: trucks } = await supabase
            .from("trucks")
            .select("*")
            .eq("carrier_id", user.id);

          if (trucks && trucks.length > 0) {
            const trucksData = trucks.map((t) => ({
              id: t.id,
              truck_id: t.truck_id || "",
              license_plate: t.license_plate || "",
              license_state: t.license_state || "",
              truck_type: t.truck_type || "",
              capacity: t.capacity || "",
              gps_device_id: t.gps_device_id || "",
              material_types_handled: t.material_types_handled || [],
              vin: t.vin || "",
              is_on_insurance_policy: t.is_on_insurance_policy ? "Yes" : "No",
            }));
            setAdditionalTrucks(trucksData);
          }

          // Load existing trailers
          const { data: trailers } = await supabase
            .from("trailers")
            .select("*")
            .eq("company_id", user.id);

          if (trailers && trailers.length > 0) {
            const trailersData = trailers.map((t) => ({
              id: t.id,
              trailer_id: t.trailer_id || "",
              vin: t.vin || "",
              make: t.make || "",
              model: t.model || "",
              year: t.year?.toString() || "",
              is_on_insurance_policy: t.is_on_insurance_policy ? "Yes" : "No",
            }));
            setAdditionalTrailers(trailersData);
          }

          // Load existing drivers
          const { data: drivers } = await supabase
            .from("drivers")
            .select("*")
            .eq("carrier_id", user.id);

          if (drivers && drivers.length > 0) {
            const driversData = drivers.map((d) => ({
              id: d.id,
              driver_name: d.name || "",
              phone_number: d.phone || "",
              email_address: d.email || "",
              cdl_number: d.cdl_number || "",
              cdl_state: d.cdl_state || "",
              driver_type: d.driver_type || "",
              operating_hours: d.operating_hours || "",
              weekend_availability: d.weekend_availability || "",
              driver_comments: d.comments || "",
              emergency_contact: d.emergency_contact || "",
            }));
            setAdditionalDrivers(driversData);
          }
        }
      } catch (error) {
        console.error("Error prefilling form data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    if (!authLoading && user) {
      prefillFormData();
    } else if (!authLoading) {
      setIsDataLoading(false);
    }
  }, [user, authLoading]);

  const [formData, setFormData] = useState<VendorFormData>({
    vendor_company_name: "",
    business_address: "",
    city: "",
    state: "",
    zip: "",
    legal_name_for_invoicing: "",
    mailing_address_optional: "",
    mc_number: "",
    dot_number: "",
    upload_coi: null,
    upload_w9: null,
    company_name: "",
    primary_contact_name: "",
    contact_phone: "",
    contact_email: "",
    location: "",
    role: "",
    comments: "",
    truck_id: "",
    carrier_name: "",
    license_plate: "",
    license_state: "",
    truck_type: "",
    capacity: "",
    gps_device_id: "",
    material_types_handled: [],
    vin: "",
    is_on_insurance_policy: "",
    driver_name: "",
    phone_number: "",
    email_address: "",
    cdl_number: "",
    cdl_state: "",
    driver_type: "",
    operating_hours: "",
    weekend_availability: "",
    driver_comments: "",
    emergency_contact: "",
    trailer_id: "",
    trailer_vin: "",
    trailer_make: "",
    trailer_model: "",
    trailer_year: "",
    trailer_is_on_insurance_policy: "",
  });

  const updateField = (field: keyof VendorFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-populate company name in Contacts tab
    if (field === "vendor_company_name") {
      setFormData((prev) => ({ ...prev, company_name: value }));
    }
  };

  const handleCoiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateField("upload_coi", file);
    }
  };

  const handleW9FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateField("upload_w9", file);
    }
  };

  // Handle Fleet CSV Upload
  const handleFleetCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Fleet CSV parsed:", results.data);

          // Map CSV data to truck format
          const trucks = results.data.map((row: any, index: number) => ({
            id: Date.now() + index,
            truck_id: row.truck_id || "",
            license_plate: row.license_plate || "",
            license_state: row.license_state || "",
            truck_type: row.truck_type || "",
            capacity: row.capacity || "",
            gps_device_id: row.gps_device_id || "",
            material_types_handled: row.material_types_handled
              ? row.material_types_handled
                  .split(",")
                  .map((m: string) => m.trim())
              : [],
            vin: row.vin || "",
            is_on_insurance_policy:
              row.is_on_insurance_policy?.toLowerCase() === "yes"
                ? "yes"
                : "no",
          }));

          setAdditionalTrucks(trucks);
          setFleetCsvData(results.data);
          toast({
            title: "Success",
            description: `Loaded ${results.data.length} fleet records from CSV`,
          });
        },
        error: (error) => {
          console.error("CSV parse error:", error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          });
        },
      });
    }
  };

  // Handle Trailer CSV Upload
  const handleTrailerCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Trailer CSV parsed:", results.data);

          // Map CSV data to trailer format
          const trailers = results.data.map((row: any, index: number) => ({
            id: Date.now() + index,
            trailer_id: row.trailer_id || "",
            vin: row.vin || "",
            make: row.make || "",
            model: row.model || "",
            year: row.year || "",
            is_on_insurance_policy:
              row.is_on_insurance_policy?.toLowerCase() === "yes"
                ? "yes"
                : "no",
          }));

          setAdditionalTrailers(trailers);
          setTrailerCsvData(results.data);
          toast({
            title: "Success",
            description: `Loaded ${results.data.length} trailer records from CSV`,
          });
        },
        error: (error) => {
          console.error("CSV parse error:", error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          });
        },
      });
    }
  };

  // Handle Driver CSV Upload
  const handleDriverCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Driver CSV parsed:", results.data);

          // Map CSV data to driver format
          const drivers = results.data.map((row: any, index: number) => ({
            id: Date.now() + index,
            driver_name: row.driver_name || "",
            phone_number: row.phone_number || "",
            email_address: row.email_address || "",
            cdl_number: row.cdl_number || "",
            cdl_state: row.cdl_state || "",
            driver_type: row.driver_type || "",
            operating_hours: row.operating_hours || "",
            weekend_availability:
              row.weekend_availability?.toLowerCase() === "yes" ? "yes" : "no",
            driver_comments: row.driver_comments || "",
            emergency_contact: row.emergency_contact || "",
          }));

          setAdditionalDrivers(drivers);
          setDriverCsvData(results.data);
          toast({
            title: "Success",
            description: `Loaded ${results.data.length} driver records from CSV`,
          });
        },
        error: (error) => {
          console.error("CSV parse error:", error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          });
        },
      });
    }
  };

  // Download CSV Template
  const downloadFleetTemplate = () => {
    const template = `truck_id,license_plate,license_state,truck_type,capacity,gps_device_id,material_types_handled,vin,is_on_insurance_policy
TRUCK001,ABC123,CA,End Dump,25,GPS001,"Sand,Rock",1HGBH41JXMN109186,yes
TRUCK002,XYZ456,TX,Tanker,30,GPS002,"Oil,Waste",2HGBH41JXMN109187,yes`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fleet_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTrailerTemplate = () => {
    const template = `trailer_id,vin,make,model,year,is_on_insurance_policy
TRAILER001,1HGBH41JXMN109186,Great Dane,Everest,2023,yes
TRAILER002,2HGBH41JXMN109187,Wabash,DuraPlate,2022,yes`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trailer_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadDriverTemplate = () => {
    const template = `driver_name,phone_number,email_address,cdl_number,cdl_state,driver_type,operating_hours,weekend_availability,driver_comments,emergency_contact
John Doe,555-0100,john@example.com,DL123456,CA,Full-time,8am-5pm,yes,Experienced driver,Jane Doe 555-0200
Jane Smith,555-0101,jane@example.com,DL789012,TX,Part-time,9am-3pm,no,New driver,John Smith 555-0201`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "driver_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Add additional contact
  const addAdditionalContact = () => {
    const newContact = {
      id: Date.now(),
      name: "",
      phone: "",
      email: "",
      location: "",
      role: "",
      comments: "",
    };
    setAdditionalContacts([...additionalContacts, newContact]);
  };

  // Remove additional contact
  const removeAdditionalContact = (id: number) => {
    setAdditionalContacts(
      additionalContacts.filter((contact) => contact.id !== id)
    );
  };

  // Update additional contact
  const updateAdditionalContact = (
    id: number,
    field: string,
    value: string
  ) => {
    setAdditionalContacts(
      additionalContacts.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    );
  };

  // Add additional truck
  const addAdditionalTruck = () => {
    const newTruck = {
      id: Date.now(),
      truck_id: "",
      license_plate: "",
      license_state: "",
      truck_type: "",
      capacity: "",
      gps_device_id: "",
      material_types_handled: [],
      vin: "",
      is_on_insurance_policy: "",
    };
    setAdditionalTrucks([...additionalTrucks, newTruck]);
  };

  // Remove additional truck
  const removeAdditionalTruck = (id: number) => {
    setAdditionalTrucks(additionalTrucks.filter((truck) => truck.id !== id));
  };

  // Update additional truck
  const updateAdditionalTruck = (id: number, field: string, value: any) => {
    setAdditionalTrucks(
      additionalTrucks.map((truck) =>
        truck.id === id ? { ...truck, [field]: value } : truck
      )
    );
  };

  // Add additional driver
  const addAdditionalDriver = () => {
    const newDriver = {
      id: Date.now(),
      driver_name: "",
      phone_number: "",
      email_address: "",
      cdl_number: "",
      cdl_state: "",
      driver_type: "",
      operating_hours: "",
      weekend_availability: "",
      driver_comments: "",
      emergency_contact: "",
    };
    setAdditionalDrivers([...additionalDrivers, newDriver]);
  };

  // Remove additional driver
  const removeAdditionalDriver = (id: number) => {
    setAdditionalDrivers(
      additionalDrivers.filter((driver) => driver.id !== id)
    );
  };

  // Update additional driver
  const updateAdditionalDriver = (id: number, field: string, value: string) => {
    setAdditionalDrivers(
      additionalDrivers.map((driver) =>
        driver.id === id ? { ...driver, [field]: value } : driver
      )
    );
  };

  // Add additional trailer
  const addAdditionalTrailer = () => {
    const newTrailer = {
      id: Date.now(),
      trailer_id: "",
      vin: "",
      make: "",
      model: "",
      year: "",
      is_on_insurance_policy: "",
    };
    setAdditionalTrailers([...additionalTrailers, newTrailer]);
  };

  // Remove additional trailer
  const removeAdditionalTrailer = (id: number) => {
    setAdditionalTrailers(
      additionalTrailers.filter((trailer) => trailer.id !== id)
    );
  };

  // Update additional trailer
  const updateAdditionalTrailer = (
    id: number,
    field: string,
    value: string
  ) => {
    setAdditionalTrailers(
      additionalTrailers.map((trailer) =>
        trailer.id === id ? { ...trailer, [field]: value } : trailer
      )
    );
  };

  const tabOrder = [
    "company_details",
    "contacts",
    "fleet_details",
    "trailer_details",
    "driver_details",
  ];

  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentTabIndex === tabOrder.length - 1;
  const isFirstTab = currentTabIndex === 0;

  const validateCurrentTab = (): boolean => {
    switch (activeTab) {
      case "company_details":
        if (
          !formData.vendor_company_name ||
          !formData.business_address ||
          !formData.city ||
          !formData.state ||
          !formData.zip ||
          !formData.legal_name_for_invoicing ||
          !formData.mc_number ||
          !formData.dot_number ||
          !formData.upload_coi ||
          !formData.upload_w9 ||
          !signerName
        ) {
          toast({
            title: "Required Fields Missing",
            description:
              "Please fill in all required fields in Company Details (including Legal Name, MC Number, DOT Number, COI, W9, and Signer Name)",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case "contacts":
        // Validate primary contact fields (required)
        if (
          !formData.primary_contact_name ||
          !formData.contact_email ||
          !formData.contact_phone
        ) {
          toast({
            title: "Required Fields Missing",
            description:
              "Please fill in all required primary contact fields (Name, Email, Phone)",
            variant: "destructive",
          });
          return false;
        }
        // Validate additional contacts if any were added
        for (let i = 0; i < additionalContacts.length; i++) {
          const contact = additionalContacts[i];
          if (!contact.name || !contact.email || !contact.phone) {
            toast({
              title: "Required Fields Missing",
              description: `Please fill in all required fields for Additional Contact ${
                i + 1
              }`,
              variant: "destructive",
            });
            return false;
          }
        }
        return true;
      case "fleet_details":
        // Check if at least one truck has been added
        if (additionalTrucks.length === 0) {
          toast({
            title: "No Trucks Added",
            description:
              "Please add at least one truck using the 'Add Truck' button",
            variant: "destructive",
          });
          return false;
        }
        // Validate each truck has required fields
        for (let i = 0; i < additionalTrucks.length; i++) {
          const truck = additionalTrucks[i];
          if (
            !truck.truck_id ||
            !truck.license_plate ||
            !truck.license_state ||
            !truck.truck_type ||
            !truck.vin ||
            !truck.is_on_insurance_policy
          ) {
            toast({
              title: "Required Fields Missing",
              description: `Please fill in all required fields for Truck ${
                i + 1
              }`,
              variant: "destructive",
            });
            return false;
          }
        }
        return true;
      case "trailer_details":
        // Check if at least one trailer has been added
        if (additionalTrailers.length === 0) {
          toast({
            title: "No Trailers Added",
            description:
              "Please add at least one trailer using the 'Add Trailer' button",
            variant: "destructive",
          });
          return false;
        }
        // Validate each trailer has required fields
        for (let i = 0; i < additionalTrailers.length; i++) {
          const trailer = additionalTrailers[i];
          if (
            !trailer.trailer_id ||
            !trailer.vin ||
            !trailer.make ||
            !trailer.model ||
            !trailer.year ||
            !trailer.is_on_insurance_policy
          ) {
            toast({
              title: "Required Fields Missing",
              description: `Please fill in all required fields for Trailer ${
                i + 1
              }`,
              variant: "destructive",
            });
            return false;
          }
        }
        return true;
      case "driver_details":
        // Check if at least one driver has been added
        if (additionalDrivers.length === 0) {
          toast({
            title: "No Drivers Added",
            description:
              "Please add at least one driver using the 'Add Driver' button",
            variant: "destructive",
          });
          return false;
        }
        // Validate each driver has required fields
        for (let i = 0; i < additionalDrivers.length; i++) {
          const driver = additionalDrivers[i];
          if (
            !driver.driver_name ||
            !driver.phone_number ||
            !driver.cdl_number ||
            !driver.cdl_state ||
            !driver.driver_type
          ) {
            toast({
              title: "Required Fields Missing",
              description: `Please fill in all required fields for Driver ${
                i + 1
              }`,
              variant: "destructive",
            });
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  // Auto-save current tab data to Supabase
  const autoSaveTabData = async (tabName: string) => {
    if (!user?.id) return;

    try {
      let updateData: any = {};
      let statusField: string | null = null;

      switch (tabName) {
        case "company_details":
          // Upload files if they exist
          let coiUrl = null;
          let w9Url = null;

          if (formData.upload_coi) {
            coiUrl = await uploadFile(
              formData.upload_coi,
              "vendor-documents",
              `coi/${user.id}`
            );
          }

          if (formData.upload_w9) {
            w9Url = await uploadFile(
              formData.upload_w9,
              "vendor-documents",
              `w9/${user.id}`
            );
          }

          updateData = {
            name: formData.vendor_company_name,
            business_address: formData.business_address,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            legal_name_for_invoicing: formData.legal_name_for_invoicing,
            mailing_address: formData.mailing_address_optional || null,
            mc_number: formData.mc_number,
            dot_number: formData.dot_number,
            company_details_status: "Complete",
            status: "Onboarding In Progress",
          };

          if (coiUrl) updateData.coi_file_url = coiUrl;
          if (w9Url) updateData.w9_file_url = w9Url;

          statusField = "company_details_status";
          break;

        case "contacts":
          // Save contacts to Contact_Info table
          // Delete existing contacts for this company first to avoid duplicates
          await supabase
            .from("Contact_Info")
            .delete()
            .eq("company_id", user.id);

          // Build contacts array starting with primary contact from formData
          const contactsData = [];

          // Add primary contact (always first and marked as primary)
          // Only one contact should be marked as primary
          if (
            formData.primary_contact_name &&
            formData.contact_email &&
            formData.contact_phone
          ) {
            contactsData.push({
              company_id: user.id,
              Contact_Name: formData.primary_contact_name,
              Contact_Phone: formData.contact_phone,
              Contact_Email: formData.contact_email,
              Location: formData.location || null,
              Role: formData.role || null,
              Notes: formData.comments || null,
              is_primary: true, // Only this contact is marked as primary
            });
          }

          // Add additional contacts (explicitly marked as NOT primary)
          additionalContacts.forEach((contact) => {
            contactsData.push({
              company_id: user.id,
              Contact_Name: contact.name,
              Contact_Phone: contact.phone,
              Contact_Email: contact.email,
              Location: contact.location || null,
              Role: contact.role || null,
              Notes: contact.comments || null,
              is_primary: false, // Additional contacts are never primary
            });
          });

          // Insert all contacts
          if (contactsData.length > 0) {
            const { error: contactsError } = await supabase
              .from("Contact_Info")
              .insert(contactsData);

            if (contactsError) {
              console.error("Error saving contacts:", contactsError);
            } else {
              console.log(
                `Saved ${contactsData.length} contacts (1 primary, ${additionalContacts.length} additional)`
              );
            }
          }

          updateData = {
            contacts_status: "Complete",
          };
          statusField = "contacts_status";
          break;

        case "fleet":
        case "fleet_details":
          // Save trucks to trucks table
          if (additionalTrucks.length > 0) {
            // Check for duplicate truck IDs (excluding current company's trucks)
            const truckIds = additionalTrucks.map((t) => t.truck_id);
            const duplicateTruckIds = await checkDuplicateTrucks(
              truckIds,
              user.id
            );

            if (duplicateTruckIds.length > 0) {
              toast({
                title: "Duplicate Truck IDs Found",
                description: `The following truck IDs already exist in the database: ${duplicateTruckIds.join(
                  ", "
                )}. Please use unique truck IDs.`,
                variant: "destructive",
              });
              setIsSaving(false);
              return;
            }

            // Delete existing trucks for this company first
            await supabase.from("trucks").delete().eq("carrier_id", user.id);

            // Insert new trucks
            const trucksData = additionalTrucks.map((truck) => ({
              truck_id: truck.truck_id,
              carrier_id: user.id,
              license_plate: truck.license_plate,
              license_state: truck.license_state,
              truck_type: truck.truck_type,
              capacity: truck.capacity,
              gps_device_id: truck.gps_device_id,
              material_types_handled: truck.material_types_handled,
              vin: truck.vin,
              is_on_insurance_policy: truck.is_on_insurance_policy === "Yes",
              status: "active",
            }));

            const { error: trucksError } = await supabase
              .from("trucks")
              .insert(trucksData);

            if (trucksError) {
              console.error("Error saving trucks:", trucksError);
            }
          }

          updateData = {
            fleet_status: "Complete",
          };
          statusField = "fleet_status";
          break;

        case "trailer":
        case "trailer_details":
          // Save trailers to trailers table
          if (additionalTrailers.length > 0) {
            // Check for duplicate trailer IDs (excluding current company's trailers)
            const trailerIds = additionalTrailers.map((t) => t.trailer_id);
            const duplicateTrailerIds = await checkDuplicateTrailers(
              trailerIds,
              user.id
            );

            if (duplicateTrailerIds.length > 0) {
              toast({
                title: "Duplicate Trailer IDs Found",
                description: `The following trailer IDs already exist in the database: ${duplicateTrailerIds.join(
                  ", "
                )}. Please use unique trailer IDs.`,
                variant: "destructive",
              });
              setIsSaving(false);
              return;
            }

            // Delete existing trailers for this company first
            await supabase.from("trailers").delete().eq("company_id", user.id);

            // Insert new trailers
            const trailersData = additionalTrailers.map((trailer) => ({
              trailer_id: trailer.trailer_id,
              company_id: user.id,
              vin: trailer.vin,
              make: trailer.make,
              model: trailer.model,
              year: parseInt(trailer.year) || null,
              is_on_insurance_policy: trailer.is_on_insurance_policy === "Yes",
              status: "active",
            }));

            const { error: trailersError } = await supabase
              .from("trailers")
              .insert(trailersData);

            if (trailersError) {
              console.error("Error saving trailers:", trailersError);
            }
          }

          updateData = {
            trailers_status: "Complete",
          };
          statusField = "trailers_status";
          break;

        case "drivers":
        case "driver_details":
          // Save drivers to drivers table - Check for duplicates first
          if (additionalDrivers.length > 0) {
            // Check for duplicate emails in the database
            const driverEmails = additionalDrivers
              .map((d) => d.email_address)
              .filter((email) => email && email.trim() !== "");

            if (driverEmails.length > 0) {
              const { data: existingDrivers, error: checkError } =
                await supabase
                  .from("drivers")
                  .select("email")
                  .in("email", driverEmails);

              if (checkError) {
                console.error(
                  "Error checking for duplicate drivers:",
                  checkError
                );
                toast({
                  title: "Error",
                  description:
                    "Failed to verify driver emails. Please try again.",
                  variant: "destructive",
                });
                return;
              }

              if (existingDrivers && existingDrivers.length > 0) {
                const duplicateEmails = existingDrivers.map((d) => d.email);
                console.error(
                  "Duplicate driver emails found:",
                  duplicateEmails
                );
                toast({
                  title: "Duplicate Driver Emails",
                  description: `The following driver email(s) already exist: ${duplicateEmails.join(
                    ", "
                  )}. Please use different email addresses.`,
                  variant: "destructive",
                });
                return;
              }
            }

            // No duplicates found, proceed with insertion
            const driversData = additionalDrivers.map((driver, index) => {
              // Generate unique driver QR code with index to ensure uniqueness
              const driverQrCode = `DRIVER-${Date.now()}-${index}-${Math.random()
                .toString(36)
                .substr(2, 9)}`;

              return {
                name: driver.driver_name,
                carrier_id: user.id, // Ensure correct company foreign key
                phone: driver.phone_number,
                email: driver.email_address,
                cdl_number: driver.cdl_number,
                cdl_state: driver.cdl_state,
                driver_type: driver.driver_type,
                operating_hours: driver.operating_hours,
                weekend_availability: driver.weekend_availability === "yes",
                comments: driver.driver_comments,
                emergency_contact: driver.emergency_contact,
                driver_qr_code: driverQrCode, // Add QR code
                status: "active",
              };
            });

            const { data: insertedDrivers, error: driversError } =
              await supabase.from("drivers").insert(driversData).select();

            if (driversError) {
              console.error("Error saving drivers:", driversError);
              console.error("Driver data that failed:", driversData);

              // Check if it's a duplicate email error from database constraint
              if (
                driversError.message.includes("duplicate") ||
                driversError.code === "23505"
              ) {
                toast({
                  title: "Duplicate Driver Email",
                  description:
                    "One or more driver emails already exist in the system. Please use different email addresses.",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Error Saving Drivers",
                  description: `Failed to save drivers. Error: ${driversError.message}`,
                  variant: "destructive",
                });
              }
              return;
            } else {
              console.log(
                `Successfully inserted ${
                  insertedDrivers?.length || 0
                } driver(s) for company ${user.id}`
              );
              console.log("Inserted drivers:", insertedDrivers);
            }
          }

          updateData = {
            drivers_status: "Complete",
          };
          statusField = "drivers_status";
          break;

        default:
          return;
      }

      // Update company record
      const { error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        console.error("Error auto-saving tab data:", error);
      } else {
        console.log(`Auto-saved ${tabName} tab data`);
      }
    } catch (error) {
      console.error("Error in autoSaveTabData:", error);
    }
  };

  const handleNext = async () => {
    if (!isLastTab) {
      if (validateCurrentTab()) {
        // Auto-save current tab data before moving to next
        await autoSaveTabData(activeTab);

        const nextTab = tabOrder[currentTabIndex + 1];
        setActiveTab(nextTab);
        // Mark next tab as available
        if (!completedTabs.includes(nextTab)) {
          setCompletedTabs([...completedTabs, nextTab]);
        }
      }
    }
  };

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(tabOrder[currentTabIndex - 1]);
    }
  };

  // Helper function to upload files to Supabase storage
  const uploadFile = async (
    file: File,
    bucket: string,
    path: string
  ): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const filepath = `${path}/${filename}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filepath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filepath);

      return publicData.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  // Check for duplicate truck IDs in database
  const checkDuplicateTrucks = async (
    truckIds: string[],
    excludeCarrierId?: string
  ): Promise<string[]> => {
    try {
      let query = supabase
        .from("trucks")
        .select("truck_id")
        .in("truck_id", truckIds);

      // Exclude trucks from the current company if updating
      if (excludeCarrierId) {
        query = query.neq("carrier_id", excludeCarrierId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error checking duplicate trucks:", error);
        return [];
      }

      return data?.map((t) => t.truck_id) || [];
    } catch (error) {
      console.error("Error checking duplicate trucks:", error);
      return [];
    }
  };

  // Check for duplicate trailer IDs in database
  const checkDuplicateTrailers = async (
    trailerIds: string[],
    excludeCompanyId?: string
  ): Promise<string[]> => {
    try {
      let query = supabase
        .from("trailers")
        .select("trailer_id")
        .in("trailer_id", trailerIds);

      // Exclude trailers from the current company if updating
      if (excludeCompanyId) {
        query = query.neq("company_id", excludeCompanyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error checking duplicate trailers:", error);
        return [];
      }

      return data?.map((t) => t.trailer_id) || [];
    } catch (error) {
      console.error("Error checking duplicate trailers:", error);
      return [];
    }
  };

  const handleSubmit = async () => {
    // Validate final contract acceptance
    if (!finalContractAccepted) {
      toast({
        title: "Terms Acceptance Required",
        description:
          "Please accept the terms and conditions before submitting. You may need to log out and log back in to refresh your session.",
        variant: "destructive",
      });
      return;
    }

    // Validate all required company details fields
    if (
      !formData.vendor_company_name ||
      !formData.business_address ||
      !formData.city ||
      !formData.state ||
      !formData.zip ||
      !formData.legal_name_for_invoicing ||
      !formData.mc_number ||
      !formData.dot_number ||
      !formData.upload_coi ||
      !formData.upload_w9
    ) {
      toast({
        title: "Company Details Required",
        description:
          "Please fill in all required company details fields (Legal Name, MC Number, DOT Number, COI, W9) on the Company tab before submitting",
        variant: "destructive",
      });
      setActiveTab("company_details");
      return;
    }

    // Validate primary contact exists
    if (
      !formData.primary_contact_name ||
      !formData.contact_email ||
      !formData.contact_phone
    ) {
      toast({
        title: "Primary Contact Required",
        description:
          "Please fill in the primary contact information on the Contacts tab before submitting",
        variant: "destructive",
      });
      setActiveTab("contacts");
      return;
    }

    if (!signerName) {
      toast({
        title: "Signer Name Required",
        description: "Please provide the signer name on the Company Info tab",
        variant: "destructive",
      });
      setActiveTab("company_details");
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to submit the onboarding form",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload COI and W9 files if provided
      let coiUrl: string | null = null;
      let w9Url: string | null = null;

      if (formData.upload_coi) {
        coiUrl = await uploadFile(
          formData.upload_coi,
          "vendor-documents",
          "coi"
        );
        if (!coiUrl) {
          throw new Error("Failed to upload Certificate of Insurance");
        }
      }

      if (formData.upload_w9) {
        w9Url = await uploadFile(formData.upload_w9, "vendor-documents", "w9");
        if (!w9Url) {
          throw new Error("Failed to upload W9 form");
        }
      }

      // 2. Update company record (company already exists from login/admin creation)
      const companyData: any = {
        name: formData.vendor_company_name,
        business_address: formData.business_address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        legal_name_for_invoicing: formData.legal_name_for_invoicing,
        mailing_address: showMailingAddress
          ? formData.mailing_address_optional
          : null,
        mc_number: formData.mc_number,
        dot_number: formData.dot_number,
        status: "Onboarding Submitted",
        // Preserve agreement status if already accepted (for returning users)
        agreement_status: finalContractAccepted ? "Accepted" : "Not Shown",
        company_details_status: "Complete",
        contacts_status: "Complete", // Primary contact is always required
        fleet_status: additionalTrucks.length > 0 ? "Complete" : "Not Started",
        trailers_status:
          additionalTrailers.length > 0 ? "Complete" : "Not Started",
        drivers_status:
          additionalDrivers.length > 0 ? "Complete" : "Not Started",
        portal_access_enabled: false,
        updated_at: new Date().toISOString(),
      };

      // Only update file URLs if new files were uploaded
      if (coiUrl) companyData.coi_file_url = coiUrl;
      if (w9Url) companyData.w9_file_url = w9Url;

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .update(companyData)
        .eq("id", user.id)
        .select()
        .single();

      if (companyError) throw companyError;
      if (!company) throw new Error("Failed to update company record");

      console.log("Company created:", company);

      // 3. Create contact records
      // First, delete any existing contacts to avoid duplicates
      await supabase.from("Contact_Info").delete().eq("company_id", company.id);

      const contactsData = [];

      // Add primary contact (always first and marked as primary)
      contactsData.push({
        company_id: company.id,
        Contact_Name: formData.primary_contact_name,
        Contact_Phone: formData.contact_phone,
        Contact_Email: formData.contact_email,
        Location: formData.location || null,
        Role: formData.role || null,
        Notes: formData.comments || null,
        is_primary: true,
      });

      // Add additional contacts (not primary)
      additionalContacts.forEach((contact) => {
        contactsData.push({
          company_id: company.id,
          Contact_Name: contact.name,
          Contact_Phone: contact.phone,
          Contact_Email: contact.email,
          Location: contact.location || null,
          Role: contact.role || null,
          Notes: contact.comments || null,
          is_primary: false,
        });
      });

      const { error: contactsError } = await supabase
        .from("Contact_Info")
        .insert(contactsData);

      if (contactsError) {
        console.error("Error creating contacts:", contactsError);
        throw new Error(`Failed to create contacts: ${contactsError.message}`);
      } else {
        console.log("Contacts created:", contactsData.length);
      }

      // 4. Create truck records
      if (additionalTrucks.length > 0) {
        // Check for duplicate truck IDs (exclude current company's trucks)
        const truckIds = additionalTrucks.map((t) => t.truck_id);
        const duplicateTruckIds = await checkDuplicateTrucks(
          truckIds,
          company.id
        );

        if (duplicateTruckIds.length > 0) {
          toast({
            title: "Duplicate Truck IDs Found",
            description: `The following truck IDs already exist in the database: ${duplicateTruckIds.join(
              ", "
            )}. Please use unique truck IDs.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const trucksData = additionalTrucks.map((truck) => ({
          truck_id: truck.truck_id,
          carrier_id: company.id,
          license_plate: truck.license_plate,
          license_state: truck.license_state,
          truck_type: truck.truck_type,
          capacity: truck.capacity,
          gps_device_id: truck.gps_device_id,
          material_types_handled: truck.material_types_handled,
          vin: truck.vin,
          is_on_insurance_policy: truck.is_on_insurance_policy === "Yes",
          status: "active",
        }));

        // Use upsert to handle trucks that may have been created during "Save Progress"
        const { error: trucksError } = await supabase
          .from("trucks")
          .upsert(trucksData, {
            onConflict: "truck_id,carrier_id",
            ignoreDuplicates: false,
          });

        if (trucksError) {
          console.error("Error creating/updating trucks:", trucksError);
          // Don't fail the whole submission if trucks fail
        } else {
          console.log("Trucks created/updated:", trucksData.length);
        }
      }

      // 5. Create trailer records
      if (additionalTrailers.length > 0) {
        // Check for duplicate trailer IDs (exclude current company's trailers)
        const trailerIds = additionalTrailers.map((t) => t.trailer_id);
        const duplicateTrailerIds = await checkDuplicateTrailers(
          trailerIds,
          company.id
        );

        if (duplicateTrailerIds.length > 0) {
          toast({
            title: "Duplicate Trailer IDs Found",
            description: `The following trailer IDs already exist in the database: ${duplicateTrailerIds.join(
              ", "
            )}. Please use unique trailer IDs.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const trailersData = additionalTrailers.map((trailer) => ({
          trailer_id: trailer.trailer_id,
          company_id: company.id,
          vin: trailer.vin,
          make: trailer.make,
          model: trailer.model,
          year: parseInt(trailer.year) || null,
          is_on_insurance_policy: trailer.is_on_insurance_policy === "Yes",
          status: "active",
        }));

        // Use upsert to handle trailers that may have been created during "Save Progress"
        const { error: trailersError } = await supabase
          .from("trailers")
          .upsert(trailersData, {
            onConflict: "trailer_id,company_id",
            ignoreDuplicates: false,
          });

        if (trailersError) {
          console.error("Error creating/updating trailers:", trailersError);
          // Don't fail the whole submission if trailers fail
        } else {
          console.log("Trailers created/updated:", trailersData.length);
        }
      }

      // 6. Create driver records - Check for duplicate emails first
      if (additionalDrivers.length > 0) {
        // Check for duplicate emails in the database
        const driverEmails = additionalDrivers
          .map((d) => d.email_address)
          .filter((email) => email && email.trim() !== "");

        if (driverEmails.length > 0) {
          const { data: existingDrivers, error: checkError } = await supabase
            .from("drivers")
            .select("email")
            .in("email", driverEmails);

          if (checkError) {
            console.error("Error checking for duplicate drivers:", checkError);
            toast({
              title: "Error",
              description: "Failed to verify driver emails. Please try again.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }

          if (existingDrivers && existingDrivers.length > 0) {
            const duplicateEmails = existingDrivers.map((d) => d.email);
            console.error("Duplicate driver emails found:", duplicateEmails);
            toast({
              title: "Duplicate Driver Emails",
              description: `The following driver email(s) already exist in the system: ${duplicateEmails.join(
                ", "
              )}. Please use different email addresses.`,
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }

        // No duplicates found, proceed with insertion
        const driversData = additionalDrivers.map((driver, index) => {
          // Generate unique driver QR code with index to ensure uniqueness
          const driverQrCode = `DRIVER-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          return {
            name: driver.driver_name,
            carrier_id: company.id, // Ensure correct company foreign key
            email: driver.email_address,
            phone: driver.phone_number,
            cdl_number: driver.cdl_number,
            cdl_state: driver.cdl_state,
            driver_type: driver.driver_type,
            operating_hours: driver.operating_hours,
            weekend_availability: driver.weekend_availability,
            comments: driver.driver_comments,
            emergency_contact: driver.emergency_contact,
            driver_qr_code: driverQrCode, // Add QR code
            status: "active",
          };
        });

        console.log("Attempting to insert drivers:", driversData);

        // Insert drivers
        const { data: insertedDrivers, error: driversError } = await supabase
          .from("drivers")
          .insert(driversData)
          .select();

        if (driversError) {
          console.error("Error creating drivers:", driversError);
          console.error("Driver data that failed:", driversData);

          // Check if it's a duplicate email error from database constraint
          if (
            driversError.message.includes("duplicate") ||
            driversError.code === "23505"
          ) {
            toast({
              title: "Duplicate Driver Email",
              description:
                "One or more driver emails already exist in the system. Please use different email addresses.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error Creating Drivers",
              description: `Failed to create ${driversData.length} driver(s). Error: ${driversError.message}`,
              variant: "destructive",
            });
          }
          setIsSubmitting(false);
          return;
        } else {
          console.log(
            `Successfully inserted ${
              insertedDrivers?.length || 0
            } driver(s) for company ${company.id}`
          );
          console.log("Inserted drivers:", insertedDrivers);
        }
      }

      // Set success state to show success page
      setIsSubmitted(true);

      toast({
        title: "Success!",
        description: "Your vendor onboarding has been submitted successfully",
      });
    } catch (error: any) {
      console.error("Error submitting vendor onboarding:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to submit vendor onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication or loading data
  if (authLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show success page after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-background to-green-50 dark:from-green-950/20 dark:via-background dark:to-green-950/20">
        <Header showHomeButton onHomeClick={() => navigate("/")} />

        <main className="container mx-auto px-4 py-16 max-w-2xl">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="p-6 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="h-24 w-24 text-green-600 dark:text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-foreground">
                Congratulations!
              </h1>
              <p className="text-xl text-muted-foreground">
                Your onboarding has been submitted successfully
              </p>
            </div>

            {/* Info Card */}
            <Card className="p-8 text-left">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      What's Next?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      You will receive an email with the next steps for
                      completing your vendor setup.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Review Process
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Our team will review your submission and contact you
                      within 1-2 business days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Portal Access
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Once approved, you'll receive login credentials to access
                      the vendor portal.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={() =>
                  (window.location.href =
                    "https://avensis-logistics-pl-tjsx.bolt.host/")
                }
                size="lg"
                className="min-w-[200px]"
              >
                Return to Home
              </Button>
              <Button
                onClick={() => navigate("/vendor/login")}
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                Back to Login
              </Button>
            </div>

            {/* Contact Info */}
            <p className="text-sm text-muted-foreground pt-6">
              Questions? Contact us at{" "}
              <a
                href="mailto:support@avensis.com"
                className="text-primary hover:underline"
              >
                support@avensis.com
              </a>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Show initial contract acceptance screen before allowing access to form
  if (!hasAgreedToInitialContract) {
    return (
      <div className="min-h-screen bg-background">
        <Header showHomeButton onHomeClick={() => navigate("/")} />

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Vendor Service Agreement
              </h1>
              <p className="text-muted-foreground">
                Please read and accept the terms before proceeding with
                onboarding
              </p>
            </div>

            {/* Contract Card */}
            <Card className="shadow-lg">
              <div className="p-8">
                <div className="bg-muted p-6 rounded-lg max-h-[500px] overflow-y-auto mb-6">
                  <div className="prose prose-sm max-w-none">
                    <h4 className="font-semibold text-lg mb-4">
                      {APP_TITLE} APP USAGE AGREEMENT
                    </h4>

                    <p className="text-sm text-muted-foreground mb-4">
                      This App Usage Agreement ("Agreement") governs the use of
                      the {APP_TITLE} digital platform ("Platform"), powered by
                      FusionIQ Labs LLC, by any trucking or transportation
                      vendor ("Vendor") and its authorized users. By selecting
                      "I Agree", the Vendor acknowledges that it has read,
                      understood, and accepted the terms of this Agreement. Last
                      updated: 26.11.2025.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      1. PURPOSE
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} provides a secure, paperless environment for
                      creating, verifying, and managing load tickets and
                      delivery documentation. The Platform supports Avensis
                      Energy LLC and its approved vendors in executing digital
                      hauling operations.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      2. PLATFORM ACCESS
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      Vendors may access the Platform solely for legitimate
                      business activities authorized by Avensis Energy. Login
                      credentials are for internal company use only and must not
                      be shared or transferred. {APP_TITLE} may monitor usage to
                      maintain system security and performance.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      3. PLATFORM FEES
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      A Platform Fee of USD $1.00 per load processed through{" "}
                      {APP_TITLE} applies. The fee will be automatically
                      deducted from Vendor payout settlements processed through
                      Avensis Energy. {APP_TITLE} may adjust this fee with a
                      minimum of 30 days’ notice, provided through the app or in
                      writing.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      4. DATA OWNERSHIP
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      All operational data related to loads—including pickup and
                      delivery details, ticket images, signatures, weights, and
                      GPS data—are owned by Avensis Energy LLC. FusionIQ Labs
                      LLC retains ownership of the software, code, workflows,
                      and analytics comprising the {APP_TITLE} Platform. The
                      Vendor grants {APP_TITLE} and Avensis Energy permission to
                      use Vendor-submitted data for operational processing,
                      audits, and compliance.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      5. CONFIDENTIALITY & DATA PROTECTION
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} implements reasonable technical and
                      administrative safeguards to protect data entered into the
                      Platform. Vendors must not attempt to access, obtain, or
                      disclose data belonging to other parties.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      6. SERVICE NATURE
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} is not a broker, carrier, dispatcher, or
                      employer of the Vendor or its drivers. It functions solely
                      as a digital documentation and workflow system. Vendors
                      remain fully responsible for their own operations,
                      equipment, and personnel.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      7. LIMITATION OF LIABILITY
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} and FusionIQ Labs LLC are not liable for any
                      indirect, incidental, or consequential damages arising
                      from Platform use. Total liability to any Vendor shall not
                      exceed the Platform Fees charged for that Vendor’s loads
                      during the three (3) months preceding any claim.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      8. SUSPENSION OF ACCESS
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} may suspend or revoke Platform access if a
                      Vendor misuses the system, introduces security risks, or
                      engages in fraudulent activity. Because billing is handled
                      through Avensis Energy, suspension affects access only and
                      does not modify payment obligations between Avensis Energy
                      and FusionIQ Labs.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      9. UPDATES TO TERMS
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      {APP_TITLE} may update this Agreement from time to time.
                      Continued use of the Platform after notice of any update
                      constitutes acceptance of the revised terms.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      10. GOVERNING LAW & DISPUTE RESOLUTION
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      This Agreement is governed by the laws of the State of
                      Texas. Any dispute will first be addressed through
                      informal discussion, and if unresolved, through
                      arbitration held in Texas.
                    </p>

                    <h5 className="font-semibold text-base mt-6 mb-3">
                      11. ACKNOWLEDGMENT
                    </h5>
                    <p className="text-sm text-muted-foreground mb-4">
                      By clicking "I Agree", the Vendor confirms that:
                      <br />• It is authorized to act on behalf of its company;
                      <br />• It understands {APP_TITLE} is a digital
                      documentation service only; and
                      <br />• It agrees to the USD $1.00 per load Platform Fee
                      and all terms listed above.
                    </p>

                    <p className="text-sm text-muted-foreground mt-8 italic">
                      © 2025 {APP_TITLE} — Powered by FusionIQ Labs LLC. All
                      Rights Reserved.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 mb-6 p-4 bg-primary/5 rounded-lg">
                  <Checkbox
                    id="initial-contract-acceptance"
                    checked={initialContractAccepted}
                    onCheckedChange={(checked) =>
                      setInitialContractAccepted(checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="initial-contract-acceptance"
                      className="text-base font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      I have read and agree to the terms of this Vendor Service
                      Agreement *
                    </label>
                    <p className="text-sm text-muted-foreground">
                      By checking this box, you acknowledge that you have read,
                      understood, and agree to be bound by the terms and
                      conditions outlined above. You must accept these terms to
                      proceed with the onboarding process.
                    </p>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={!initialContractAccepted}
                  onClick={async () => {
                    if (initialContractAccepted && user?.id) {
                      // Update agreement_status in database
                      await supabase
                        .from("companies")
                        .update({ agreement_status: "Accepted" })
                        .eq("id", user.id);

                      setHasAgreedToInitialContract(true);
                      setFinalContractAccepted(true); // ✅ Also set final contract as accepted
                      toast({
                        title: "Terms Accepted",
                        description:
                          "You can now proceed with the onboarding form",
                      });
                    }
                  }}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Continue to Onboarding
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showHomeButton onHomeClick={() => navigate("/")} />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Vendor Onboarding
            </h1>
            <p className="text-muted-foreground">
              Complete all sections to onboard your vendor. Navigate through the
              tabs to fill in all required information.
            </p>
          </div>

          {/* Tabs */}
          <Card className="shadow-md">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                // Only allow switching to completed tabs
                if (completedTabs.includes(value)) {
                  setActiveTab(value);
                }
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5 h-auto p-4 bg-muted/50">
                <TabsTrigger
                  value="company_details"
                  disabled={!completedTabs.includes("company_details")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("company_details")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "company_details"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("company_details")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Company</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contacts"
                  disabled={!completedTabs.includes("contacts")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("contacts")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "contacts"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("contacts")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Contacts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="fleet_details"
                  disabled={!completedTabs.includes("fleet_details")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("fleet_details")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "fleet_details"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("fleet_details")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Fleet</span>
                </TabsTrigger>
                <TabsTrigger
                  value="trailer_details"
                  disabled={!completedTabs.includes("trailer_details")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("trailer_details")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "trailer_details"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("trailer_details")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Trailers</span>
                </TabsTrigger>
                <TabsTrigger
                  value="driver_details"
                  disabled={!completedTabs.includes("driver_details")}
                  className={`flex flex-col items-center gap-2 py-4 ${
                    !completedTabs.includes("driver_details")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      activeTab === "driver_details"
                        ? "bg-primary border-primary text-primary-foreground"
                        : completedTabs.includes("driver_details")
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-red-500 border-red-500 text-white"
                    }`}
                  >
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Drivers</span>
                </TabsTrigger>
              </TabsList>

              {/* Company Details Tab */}
              <TabsContent value="company_details" className="space-y-4 p-6">
                <h2 className="text-xl font-semibold mb-4">Company Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor_company_name">
                      Vendor / Company Name *
                    </Label>
                    <Input
                      id="vendor_company_name"
                      value={formData.vendor_company_name}
                      readOnly
                      disabled
                      className="bg-muted cursor-not-allowed"
                      placeholder="Legal vendor or company name"
                      title="Company name is set by the administrator and cannot be changed during onboarding"
                    />
                    <p className="text-xs text-muted-foreground">
                      Company name is set by the administrator and cannot be
                      changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_address">Business Address *</Label>
                    <AddressInput
                      value={formData.business_address}
                      onChange={(value) =>
                        updateField("business_address", value)
                      }
                      placeholder="Street address of the business"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="City of the business address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="State or region"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zip">Zip *</Label>
                    <Input
                      id="zip"
                      value={formData.zip}
                      onChange={(e) => updateField("zip", e.target.value)}
                      placeholder="ZIP or postal code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_name_for_invoicing">
                      Legal Name Used for Invoicing *
                    </Label>
                    <Input
                      id="legal_name_for_invoicing"
                      value={formData.legal_name_for_invoicing}
                      onChange={(e) =>
                        updateField("legal_name_for_invoicing", e.target.value)
                      }
                      placeholder="Legal entity name for invoices"
                      required
                    />
                  </div>

                  {/* Mailing Address Toggle */}
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="different-mailing-address"
                        checked={showMailingAddress}
                        onCheckedChange={(checked) =>
                          setShowMailingAddress(checked as boolean)
                        }
                      />
                      <Label
                        htmlFor="different-mailing-address"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Mailing address is different from company address
                      </Label>
                    </div>

                    {/* Mailing Address Field - Only shown when toggle is checked */}
                    {showMailingAddress && (
                      <div className="space-y-2">
                        <Label htmlFor="mailing_address_optional">
                          Mailing Address
                        </Label>
                        <AddressInput
                          value={formData.mailing_address_optional}
                          onChange={(value) =>
                            updateField("mailing_address_optional", value)
                          }
                          placeholder="Enter mailing address"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mc_number">MC Number *</Label>
                    <Input
                      id="mc_number"
                      value={formData.mc_number}
                      onChange={(e) => updateField("mc_number", e.target.value)}
                      placeholder="Motor Carrier number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dot_number">DOT Number *</Label>
                    <Input
                      id="dot_number"
                      value={formData.dot_number}
                      onChange={(e) =>
                        updateField("dot_number", e.target.value)
                      }
                      placeholder="Department of Transportation number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upload_coi">
                      Upload COI (Certificate of Insurance) *
                    </Label>
                    <Input
                      id="upload_coi"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleCoiFileChange}
                      className="cursor-pointer"
                      required
                    />
                    {formData.upload_coi && (
                      <p className="text-sm text-primary">
                        Selected: {formData.upload_coi.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upload_w9">Upload W9 *</Label>
                    <Input
                      id="upload_w9"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleW9FileChange}
                      className="cursor-pointer"
                      required
                    />
                    {formData.upload_w9 && (
                      <p className="text-sm text-primary">
                        Selected: {formData.upload_w9.name}
                      </p>
                    )}
                  </div>

                  {/* Signer Name Section */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="signer_name">Signer Name *</Label>
                    <Input
                      id="signer_name"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Name of person signing this agreement"
                    />
                    <p className="text-xs text-muted-foreground">
                      By providing your name, you agree to the terms and
                      conditions
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Contacts Tab */}
              <TabsContent value="contacts" className="space-y-4 p-6">
                {/* Show info banner if contacts were pre-loaded from database */}
                {hasPreloadedContacts && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-blue-900 mb-1">
                          Existing Contact Information Found
                        </h3>
                        <p className="text-sm text-blue-700">
                          We've pre-filled the contact information that was
                          previously provided for your company. You can review
                          and update these details below, or add additional
                          contacts as needed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Primary Contact</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalContact}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Contact
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name field hidden as requested */}

                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_name">
                      Primary Contact Name *
                    </Label>
                    <Input
                      id="primary_contact_name"
                      value={formData.primary_contact_name}
                      onChange={(e) =>
                        updateField("primary_contact_name", e.target.value)
                      }
                      placeholder="Main contact person"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone *</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) =>
                        updateField("contact_phone", e.target.value)
                      }
                      placeholder="Main phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) =>
                        updateField("contact_email", e.target.value)
                      }
                      placeholder="Email for dispatch & system alerts"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      placeholder="Primary operating location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => updateField("role", e.target.value)}
                      placeholder="e.g., Owner, Dispatcher, Operations"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="comments">Comments</Label>
                    <Textarea
                      id="comments"
                      value={formData.comments}
                      onChange={(e) => updateField("comments", e.target.value)}
                      placeholder="Any notes about this contact"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Additional Contacts */}
                {additionalContacts.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h3 className="text-lg font-semibold">
                      Additional Contacts
                    </h3>
                    {additionalContacts.map((contact, index) => (
                      <Card key={contact.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Contact {index + 2}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdditionalContact(contact.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Contact Name</Label>
                            <Input
                              value={contact.name}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "name",
                                  e.target.value
                                )
                              }
                              placeholder="Contact person name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                              type="tel"
                              value={contact.phone}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "phone",
                                  e.target.value
                                )
                              }
                              placeholder="Phone number"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "email",
                                  e.target.value
                                )
                              }
                              placeholder="Email address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Location</Label>
                            <AddressInput
                              value={contact.location}
                              onChange={(value) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "location",
                                  value
                                )
                              }
                              placeholder="Operating location"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Input
                              value={contact.role}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "role",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., Manager, Supervisor"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Comments</Label>
                            <Textarea
                              value={contact.comments}
                              onChange={(e) =>
                                updateAdditionalContact(
                                  contact.id,
                                  "comments",
                                  e.target.value
                                )
                              }
                              placeholder="Any notes about this contact"
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Fleet Details Tab */}
              <TabsContent value="fleet_details" className="space-y-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Fleet Details</h2>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadFleetTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("fleet-csv-upload")?.click()
                      }
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                    <input
                      id="fleet-csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFleetCsvUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={addAdditionalTruck}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Truck
                    </Button>
                  </div>
                </div>

                {/* Additional Trucks */}
                {additionalTrucks.length > 0 && (
                  <div className="space-y-4">
                    {additionalTrucks.map((truck, index) => (
                      <Card key={truck.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Truck {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdditionalTruck(truck.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Truck ID *</Label>
                            <Input
                              value={truck.truck_id}
                              onChange={(e) =>
                                updateAdditionalTruck(
                                  truck.id,
                                  "truck_id",
                                  e.target.value
                                )
                              }
                              placeholder="Unique truck number"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>License Plate *</Label>
                            <Input
                              value={truck.license_plate}
                              onChange={(e) => {
                                const value = e.target.value.slice(0, 8); // Max 8 characters
                                updateAdditionalTruck(
                                  truck.id,
                                  "license_plate",
                                  value
                                );
                              }}
                              placeholder="License plate number"
                              maxLength={8}
                            />
                            <p className="text-xs text-muted-foreground">
                              Maximum 8 characters
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>License State *</Label>
                            <Select
                              value={truck.license_state}
                              onValueChange={(value) =>
                                updateAdditionalTruck(
                                  truck.id,
                                  "license_state",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AL">Alabama</SelectItem>
                                <SelectItem value="AK">Alaska</SelectItem>
                                <SelectItem value="AZ">Arizona</SelectItem>
                                <SelectItem value="AR">Arkansas</SelectItem>
                                <SelectItem value="CA">California</SelectItem>
                                <SelectItem value="CO">Colorado</SelectItem>
                                <SelectItem value="CT">Connecticut</SelectItem>
                                <SelectItem value="DE">Delaware</SelectItem>
                                <SelectItem value="FL">Florida</SelectItem>
                                <SelectItem value="GA">Georgia</SelectItem>
                                <SelectItem value="HI">Hawaii</SelectItem>
                                <SelectItem value="ID">Idaho</SelectItem>
                                <SelectItem value="IL">Illinois</SelectItem>
                                <SelectItem value="IN">Indiana</SelectItem>
                                <SelectItem value="IA">Iowa</SelectItem>
                                <SelectItem value="KS">Kansas</SelectItem>
                                <SelectItem value="KY">Kentucky</SelectItem>
                                <SelectItem value="LA">Louisiana</SelectItem>
                                <SelectItem value="ME">Maine</SelectItem>
                                <SelectItem value="MD">Maryland</SelectItem>
                                <SelectItem value="MA">
                                  Massachusetts
                                </SelectItem>
                                <SelectItem value="MI">Michigan</SelectItem>
                                <SelectItem value="MN">Minnesota</SelectItem>
                                <SelectItem value="MS">Mississippi</SelectItem>
                                <SelectItem value="MO">Missouri</SelectItem>
                                <SelectItem value="MT">Montana</SelectItem>
                                <SelectItem value="NE">Nebraska</SelectItem>
                                <SelectItem value="NV">Nevada</SelectItem>
                                <SelectItem value="NH">
                                  New Hampshire
                                </SelectItem>
                                <SelectItem value="NJ">New Jersey</SelectItem>
                                <SelectItem value="NM">New Mexico</SelectItem>
                                <SelectItem value="NY">New York</SelectItem>
                                <SelectItem value="NC">
                                  North Carolina
                                </SelectItem>
                                <SelectItem value="ND">North Dakota</SelectItem>
                                <SelectItem value="OH">Ohio</SelectItem>
                                <SelectItem value="OK">Oklahoma</SelectItem>
                                <SelectItem value="OR">Oregon</SelectItem>
                                <SelectItem value="PA">Pennsylvania</SelectItem>
                                <SelectItem value="RI">Rhode Island</SelectItem>
                                <SelectItem value="SC">
                                  South Carolina
                                </SelectItem>
                                <SelectItem value="SD">South Dakota</SelectItem>
                                <SelectItem value="TN">Tennessee</SelectItem>
                                <SelectItem value="TX">Texas</SelectItem>
                                <SelectItem value="UT">Utah</SelectItem>
                                <SelectItem value="VT">Vermont</SelectItem>
                                <SelectItem value="VA">Virginia</SelectItem>
                                <SelectItem value="WA">Washington</SelectItem>
                                <SelectItem value="WV">
                                  West Virginia
                                </SelectItem>
                                <SelectItem value="WI">Wisconsin</SelectItem>
                                <SelectItem value="WY">Wyoming</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Truck Type *</Label>
                            <Select
                              value={truck.truck_type}
                              onValueChange={(value) =>
                                updateAdditionalTruck(
                                  truck.id,
                                  "truck_type",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select truck type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="End Dump">
                                  End Dump
                                </SelectItem>
                                <SelectItem value="Tanker">Tanker</SelectItem>
                                <SelectItem value="Flatbed">Flatbed</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Capacity (tons or barrels)</Label>
                            <Input
                              type="number"
                              value={truck.capacity}
                              onChange={(e) =>
                                updateAdditionalTruck(
                                  truck.id,
                                  "capacity",
                                  e.target.value
                                )
                              }
                              placeholder="Truck capacity"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>GPS Device ID</Label>
                            <Input
                              value={truck.gps_device_id}
                              onChange={(e) =>
                                updateAdditionalTruck(
                                  truck.id,
                                  "gps_device_id",
                                  e.target.value
                                )
                              }
                              placeholder="GPS device identifier"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>VIN *</Label>
                            <Input
                              value={truck.vin}
                              onChange={(e) =>
                                updateAdditionalTruck(
                                  truck.id,
                                  "vin",
                                  e.target.value
                                )
                              }
                              placeholder="Vehicle Identification Number"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Material Types Handled</Label>
                            <MultiSelect
                              value={truck.material_types_handled}
                              onValueChange={(value) =>
                                updateAdditionalTruck(
                                  truck.id,
                                  "material_types_handled",
                                  value
                                )
                              }
                              options={[
                                "Sand",
                                "Rock",
                                "Aggregate",
                                "Oil",
                                "Waste",
                                "Other",
                              ]}
                              placeholder="Select materials"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Is this truck listed on your insurance policy? *
                            </Label>
                            <Select
                              value={truck.is_on_insurance_policy}
                              onValueChange={(value) =>
                                updateAdditionalTruck(
                                  truck.id,
                                  "is_on_insurance_policy",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Yes or No" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Trailer Details Tab */}
              <TabsContent value="trailer_details" className="space-y-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Trailer Details</h2>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadTrailerTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("trailer-csv-upload")?.click()
                      }
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                    <input
                      id="trailer-csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleTrailerCsvUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={addAdditionalTrailer}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trailer
                    </Button>
                  </div>
                </div>

                {/* Additional Trailers */}
                {additionalTrailers.length > 0 && (
                  <div className="space-y-4">
                    {additionalTrailers.map((trailer, index) => (
                      <Card key={trailer.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Trailer {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdditionalTrailer(trailer.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Trailer ID *</Label>
                            <Input
                              value={trailer.trailer_id}
                              onChange={(e) =>
                                updateAdditionalTrailer(
                                  trailer.id,
                                  "trailer_id",
                                  e.target.value
                                )
                              }
                              placeholder="Unique trailer number"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>VIN *</Label>
                            <Input
                              value={trailer.vin}
                              onChange={(e) =>
                                updateAdditionalTrailer(
                                  trailer.id,
                                  "vin",
                                  e.target.value
                                )
                              }
                              placeholder="Vehicle Identification Number"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Make *</Label>
                            <Input
                              value={trailer.make}
                              onChange={(e) =>
                                updateAdditionalTrailer(
                                  trailer.id,
                                  "make",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., Great Dane, Wabash"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Model *</Label>
                            <Input
                              value={trailer.model}
                              onChange={(e) =>
                                updateAdditionalTrailer(
                                  trailer.id,
                                  "model",
                                  e.target.value
                                )
                              }
                              placeholder="Model name"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Year *</Label>
                            <Input
                              type="number"
                              value={trailer.year}
                              onChange={(e) =>
                                updateAdditionalTrailer(
                                  trailer.id,
                                  "year",
                                  e.target.value
                                )
                              }
                              placeholder="Year of manufacture"
                              min="1900"
                              max={new Date().getFullYear() + 1}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Is this trailer listed on your insurance policy? *
                            </Label>
                            <Select
                              value={trailer.is_on_insurance_policy}
                              onValueChange={(value) =>
                                updateAdditionalTrailer(
                                  trailer.id,
                                  "is_on_insurance_policy",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Yes or No" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Driver Details Tab */}
              <TabsContent value="driver_details" className="space-y-4 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Driver Details</h2>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadDriverTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        document.getElementById("driver-csv-upload")?.click()
                      }
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                    <input
                      id="driver-csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleDriverCsvUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={addAdditionalDriver}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Driver
                    </Button>
                  </div>
                </div>

                {/* Additional Drivers */}
                {additionalDrivers.length > 0 && (
                  <div className="space-y-4">
                    {additionalDrivers.map((driver, index) => (
                      <Card key={driver.id} className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Driver {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdditionalDriver(driver.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Driver Name *</Label>
                            <Input
                              value={driver.driver_name}
                              onChange={(e) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "driver_name",
                                  e.target.value
                                )
                              }
                              placeholder="Full name as per license"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Phone Number *</Label>
                            <Input
                              type="tel"
                              value={driver.phone_number}
                              onChange={(e) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "phone_number",
                                  e.target.value
                                )
                              }
                              placeholder="Mobile phone"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                              type="email"
                              value={driver.email_address}
                              onChange={(e) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "email_address",
                                  e.target.value
                                )
                              }
                              placeholder="Email (optional)"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>CDL Number *</Label>
                            <Input
                              value={driver.cdl_number}
                              onChange={(e) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "cdl_number",
                                  e.target.value
                                )
                              }
                              placeholder="CDL number"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>CDL State *</Label>
                            <Select
                              value={driver.cdl_state}
                              onValueChange={(value) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "cdl_state",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AL">Alabama</SelectItem>
                                <SelectItem value="AK">Alaska</SelectItem>
                                <SelectItem value="AZ">Arizona</SelectItem>
                                <SelectItem value="AR">Arkansas</SelectItem>
                                <SelectItem value="CA">California</SelectItem>
                                <SelectItem value="CO">Colorado</SelectItem>
                                <SelectItem value="CT">Connecticut</SelectItem>
                                <SelectItem value="DE">Delaware</SelectItem>
                                <SelectItem value="FL">Florida</SelectItem>
                                <SelectItem value="GA">Georgia</SelectItem>
                                <SelectItem value="HI">Hawaii</SelectItem>
                                <SelectItem value="ID">Idaho</SelectItem>
                                <SelectItem value="IL">Illinois</SelectItem>
                                <SelectItem value="IN">Indiana</SelectItem>
                                <SelectItem value="IA">Iowa</SelectItem>
                                <SelectItem value="KS">Kansas</SelectItem>
                                <SelectItem value="KY">Kentucky</SelectItem>
                                <SelectItem value="LA">Louisiana</SelectItem>
                                <SelectItem value="ME">Maine</SelectItem>
                                <SelectItem value="MD">Maryland</SelectItem>
                                <SelectItem value="MA">
                                  Massachusetts
                                </SelectItem>
                                <SelectItem value="MI">Michigan</SelectItem>
                                <SelectItem value="MN">Minnesota</SelectItem>
                                <SelectItem value="MS">Mississippi</SelectItem>
                                <SelectItem value="MO">Missouri</SelectItem>
                                <SelectItem value="MT">Montana</SelectItem>
                                <SelectItem value="NE">Nebraska</SelectItem>
                                <SelectItem value="NV">Nevada</SelectItem>
                                <SelectItem value="NH">
                                  New Hampshire
                                </SelectItem>
                                <SelectItem value="NJ">New Jersey</SelectItem>
                                <SelectItem value="NM">New Mexico</SelectItem>
                                <SelectItem value="NY">New York</SelectItem>
                                <SelectItem value="NC">
                                  North Carolina
                                </SelectItem>
                                <SelectItem value="ND">North Dakota</SelectItem>
                                <SelectItem value="OH">Ohio</SelectItem>
                                <SelectItem value="OK">Oklahoma</SelectItem>
                                <SelectItem value="OR">Oregon</SelectItem>
                                <SelectItem value="PA">Pennsylvania</SelectItem>
                                <SelectItem value="RI">Rhode Island</SelectItem>
                                <SelectItem value="SC">
                                  South Carolina
                                </SelectItem>
                                <SelectItem value="SD">South Dakota</SelectItem>
                                <SelectItem value="TN">Tennessee</SelectItem>
                                <SelectItem value="TX">Texas</SelectItem>
                                <SelectItem value="UT">Utah</SelectItem>
                                <SelectItem value="VT">Vermont</SelectItem>
                                <SelectItem value="VA">Virginia</SelectItem>
                                <SelectItem value="WA">Washington</SelectItem>
                                <SelectItem value="WV">
                                  West Virginia
                                </SelectItem>
                                <SelectItem value="WI">Wisconsin</SelectItem>
                                <SelectItem value="WY">Wyoming</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Driver Type *</Label>
                            <Select
                              value={driver.driver_type}
                              onValueChange={(value) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "driver_type",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select driver type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Company Driver">
                                  Company Driver
                                </SelectItem>
                                <SelectItem value="Owner Operator">
                                  Owner Operator
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Operating Hours</Label>
                            <Input
                              value={driver.operating_hours}
                              onChange={(e) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "operating_hours",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., 7:00 AM - 5:00 PM"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Weekend Availability</Label>
                            <Select
                              value={driver.weekend_availability}
                              onValueChange={(value) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "weekend_availability",
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select availability" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Emergency Contact</Label>
                            <Input
                              value={driver.emergency_contact}
                              onChange={(e) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "emergency_contact",
                                  e.target.value
                                )
                              }
                              placeholder="Emergency contact info"
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label>Comments</Label>
                            <Textarea
                              value={driver.driver_comments}
                              onChange={(e) =>
                                updateAdditionalDriver(
                                  driver.id,
                                  "driver_comments",
                                  e.target.value
                                )
                              }
                              placeholder="Notes"
                              rows={3}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Navigation Buttons */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstTab || isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Step {currentTabIndex + 1} of {tabOrder.length}
              </div>

              {!isLastTab ? (
                <Button onClick={handleNext} disabled={isSubmitting}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || additionalDrivers.length === 0}
                  title={
                    additionalDrivers.length === 0
                      ? "Please add at least one driver before submitting"
                      : ""
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Show warning when on driver_details tab and no drivers added */}
            {isLastTab && additionalDrivers.length === 0 && (
              <div className="text-sm text-amber-600 dark:text-amber-400 text-center">
                ⚠️ Please add at least one driver to enable submission
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorOnboarding;
