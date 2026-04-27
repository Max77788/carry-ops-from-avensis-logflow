import { Card } from "@/components/ui/card";
import type { DriverApplicationActivity } from "@/lib/driverOnboardingTypes";
import { Clock, User } from "lucide-react";
import { format } from "date-fns";

interface ActivityLogProps {
  activities: DriverApplicationActivity[];
  className?: string;
}

export const ActivityLog = ({
  activities,
  className = "",
}: ActivityLogProps) => {
  if (!activities || activities.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <p className="text-sm text-muted-foreground text-center">
          No activity yet
        </p>
      </Card>
    );
  }

  return (
    <Card className={`p-4 flex flex-col ${className}`}>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 flex-shrink-0">
        <Clock className="h-4 w-4" />
        Activity Timeline
      </h3>
      <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-3 pb-3 border-b last:border-b-0 last:pb-0"
          >
            <div className="flex-shrink-0 mt-1">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {activity.event_description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.event_type}
                  </p>
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(activity.created_at), "MMM d, h:mm a")}
                </time>
              </div>
              {activity.metadata &&
                Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
