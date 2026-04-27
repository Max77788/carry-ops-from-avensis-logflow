import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

const DriverOnboarding = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showHomeButton onHomeClick={() => navigate("/home")} />
      <main className="container mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-8 space-y-4 shadow-md">
            <h1 className="text-3xl font-bold mb-2">
              Driver Assessment & Onboarding
            </h1>
            <p className="text-muted-foreground mb-2">
              Take candidates from <b>lead</b> to <b>hired & ready to drive</b>{" "}
              in a structured pipeline.
            </p>
            <ul className="list-disc ml-4 space-y-1 text-muted-foreground text-sm">
              <li>Initial verification</li>
              <li>Document collection</li>
              <li>MVR review</li>
              <li>Drug test management</li>
              <li>Supervisor handoff</li>
              <li>Orientation & ride-along training</li>
            </ul>
            <p className="mt-4 text-foreground">
              For recruiters, supervisors, and admins.
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => navigate("/driver-onboarding/pipeline")}>
                Go to Pipeline Dashboard
              </Button>
              {/* <Button variant="outline" onClick={() => navigate("/driver-onboarding/supervisor")}>Supervisor View</Button> */}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DriverOnboarding;
