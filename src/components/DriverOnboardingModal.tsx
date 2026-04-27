import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

interface DriverOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DriverOnboardingModal = ({
  open,
  onOpenChange,
}: DriverOnboardingModalProps) => {
  // TODO: Replace with actual video URL when available
  const VIDEO_URL = ""; // Insert video URL here: "https://example.com/driver-onboarding.mp4"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Driver Onboarding</DialogTitle>
          <DialogDescription>
            Watch this video to learn how to use the eTicketing system
          </DialogDescription>
        </DialogHeader>

        {/* Video Placeholder */}
        <div className="w-full bg-black rounded-lg overflow-hidden">
          {VIDEO_URL ? (
            <video
              src={VIDEO_URL}
              controls
              className="w-full h-auto"
              style={{ aspectRatio: "16 / 9" }}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div
              className="w-full bg-black flex items-center justify-center"
              style={{ aspectRatio: "16 / 9" }}
            >
              <div className="text-center">
                <p className="text-white text-sm">
                  Video placeholder - Driver onboarding video will be displayed here
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

