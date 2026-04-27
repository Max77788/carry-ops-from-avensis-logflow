import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const VendorAlreadyOnboarded = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const companyName = location.state?.companyName || "Your company";

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/vendor/login");
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/vendor/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-4">
              Application Already Submitted
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
              {companyName} has already completed the onboarding process.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-3 text-blue-900 dark:text-blue-100">
              What happens next?
            </h2>
            <div className="space-y-3 text-blue-800 dark:text-blue-200">
              <p className="flex items-start">
                <span className="mr-2">📋</span>
                <span>
                  Our team is currently reviewing your application and submitted
                  documents.
                </span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">⏱️</span>
                <span>
                  The review process typically takes 3-5 business days.
                </span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">✉️</span>
                <span>
                  You will receive an email notification once your application
                  has been reviewed.
                </span>
              </p>
              <p className="flex items-start">
                <span className="mr-2">🔑</span>
                <span>
                  Upon approval, you will receive portal access credentials and
                  instructions.
                </span>
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-amber-900 dark:text-amber-100">
              ⚠️ Please Wait for Our Message
            </h2>
            <p className="text-amber-800 dark:text-amber-200">
              Do not attempt to access the portal until you receive confirmation
              from our team. We will contact you via email with further
              instructions once your application has been approved.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Need Assistance?</h3>
            <div className="space-y-3">
              <div className="flex items-center text-muted-foreground">
                <Mail className="h-5 w-5 mr-3 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <a
                    href="mailto:support@avensisenergy.com"
                    className="text-sm text-primary hover:underline"
                  >
                    support@avensisenergy.com
                  </a>
                </div>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Phone className="h-5 w-5 mr-3 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Phone</p>
                  <a
                    href="tel:+1234567890"
                    className="text-sm text-primary hover:underline"
                  >
                    (123) 456-7890
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Button onClick={handleLogout} variant="outline" size="lg">
              Return to Login
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VendorAlreadyOnboarded;

