import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ShipperAuthProvider } from "./contexts/ShipperAuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ShiftProvider } from "./contexts/ShiftContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { LanguageSelector } from "./components/LanguageSelector";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ShipperProtectedRoute } from "./components/shipper/ShipperProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DriverLogin from "./pages/DriverLogin";
import DriverSignUp from "./pages/DriverSignUp";
import DriverProfile from "./pages/DriverProfile";
import CreateTicket from "./pages/CreateTicket";
import ScaleHouse from "./pages/ScaleHouse";
import TicketDetails from "./pages/TicketDetails";
import DeliverTicket from "./pages/DeliverTicket";
import DestinationAttendant from "./pages/DestinationAttendant";
import DestinationAttendantConfirm from "./pages/DestinationAttendantConfirm";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import CompanyDetail from "./pages/CompanyDetail";
import Overview from "./pages/Overview";
import CarrierLogin from "./pages/CarrierLogin";
import CarrierPortal from "./pages/CarrierPortal";
import SetCarrierPassword from "./pages/SetCarrierPassword";
import VendorLogin from "./pages/VendorLogin";
import VendorOnboarding from "./pages/VendorOnboarding";
import VendorAlreadyOnboarded from "./pages/VendorAlreadyOnboarded";
import VendorProfile from "./pages/VendorProfile";
import ContractorLogin from "./pages/ContractorLogin";
import ContractorPortal from "./pages/ContractorPortal";
import NotFound from "./pages/NotFound";
import { initDatabase } from "./lib/initDatabase";
import DriverOnboarding from "./pages/DriverOnboarding";
import DriverOnboardingRoutes from "./pages/driver-onboarding/index";
import ShipperLogin from "./pages/shipper/ShipperLogin";
import ShipperSignUp from "./pages/shipper/ShipperSignUp";
import ShipperLayout from "./pages/shipper/ShipperLayout";
import LoadBoard from "./pages/shipper/LoadBoard";
import PostLoadPage from "./pages/shipper/PostLoadPage";
import LoadDetailPage from "./pages/shipper/LoadDetailPage";
import CarriersPage from "./pages/shipper/CarriersPage";
import CarrierDetailPage from "./pages/shipper/CarrierDetailPage";
import BidPortal from "./pages/BidPortal";
import CarryOpsDemoPage from "./pages/CarryOpsDemoPage";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <ShipperAuthProvider>
            <ShiftProvider>
              <TooltipProvider>
                <Toaster />
                {/* Language selector modal disabled temporarily */}
                {/* <LanguageSelector isModal={true} /> */}
                <BrowserRouter>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Login />} />
                    <Route path="/landing" element={<CarryOpsDemoPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/driver/login" element={<DriverLogin />} />
                    <Route path="/driver/signup" element={<DriverSignUp />} />
                    <Route path="/carrier/login" element={<CarrierLogin />} />
                    <Route
                      path="/admin/set-carrier-password"
                      element={<SetCarrierPassword />}
                    />
                    <Route path="/vendor/login" element={<VendorLogin />} />
                    <Route
                      path="/vendor/already-onboarded"
                      element={<VendorAlreadyOnboarded />}
                    />
                    <Route
                      path="/vendor/profile"
                      element={
                        <ProtectedRoute requiredRole="carrier">
                          <VendorProfile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/contractor/login"
                      element={<ContractorLogin />}
                    />
                    <Route
                      path="/contractor/portal"
                      element={<ContractorPortal />}
                    />
                    <Route path="/scale-house" element={<Overview />} />
                    <Route path="/tickets/:id" element={<TicketDetails />} />
                    <Route path="/tickets/create" element={<CreateTicket />} />
                    <Route
                      path="/driver-onboarding"
                      element={<DriverOnboarding />}
                    />
                    <Route
                      path="/driver-onboarding/*"
                      element={<DriverOnboardingRoutes />}
                    />

                    {/* Protected routes - require authentication */}
                    <Route
                      path="/vendor/onboarding"
                      element={
                        <ProtectedRoute requiredRole="carrier">
                          <VendorOnboarding />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/home"
                      element={
                        <ProtectedRoute>
                          <Index />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/driver/profile"
                      element={
                        <ProtectedRoute requiredRole="driver">
                          <DriverProfile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/scale-house"
                      element={
                        <ProtectedRoute requiredRole="driver">
                          <ScaleHouse />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tickets/:id/deliver"
                      element={
                        <ProtectedRoute>
                          <DeliverTicket />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tickets/:id/confirm"
                      element={
                        <ProtectedRoute requiredRole="attendant">
                          <DestinationAttendant />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tickets/:id/confirm-delivery"
                      element={
                        <ProtectedRoute requiredRole={["driver", "attendant"]}>
                          <DestinationAttendantConfirm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute>
                          <Admin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/dashboard"
                      element={<AdminDashboard />}
                    />
                    <Route
                      path="/admin/companies/:id"
                      element={<CompanyDetail />}
                    />
                    <Route
                      path="/carrier/portal"
                      element={
                        <ProtectedRoute requiredRole="carrier">
                          <CarrierPortal />
                        </ProtectedRoute>
                      }
                    />
                    {/* Bidding feature: public carrier-side bid portal (token only) */}
                    <Route path="/bid/:token" element={<BidPortal />} />

                    {/* Bidding feature: shipper auth (Supabase Auth) */}
                    <Route path="/shipper" element={<ShipperLogin />} />
                    <Route path="/shipper/login" element={<ShipperLogin />} />
                    <Route path="/shipper/signup" element={<ShipperSignUp />} />

                    {/* Bidding feature: shipper dashboard (protected) */}
                    <Route
                      element={
                        <ShipperProtectedRoute>
                          <ShipperLayout />
                        </ShipperProtectedRoute>
                      }
                    >
                      <Route path="/shipper/loads" element={<LoadBoard />} />
                      <Route path="/shipper/loads/new" element={<PostLoadPage />} />
                      <Route path="/shipper/loads/:id" element={<LoadDetailPage />} />
                      <Route path="/shipper/carriers" element={<CarriersPage />} />
                      <Route path="/shipper/carriers/:id" element={<CarrierDetailPage />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </ShiftProvider>
            </ShipperAuthProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
