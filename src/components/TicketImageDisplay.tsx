import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface TicketImageDisplayProps {
  imageUrl: string;
  ticketId: string;
}

export const TicketImageDisplay = ({
  imageUrl,
  ticketId,
}: TicketImageDisplayProps) => {
  const [showFullscreen, setShowFullscreen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `ticket-${ticketId}.jpg`;
    link.click();
  };

  return (
    <>
      {/* Ticket Image Card */}
      <Card className="overflow-hidden shadow-md">
        <div className="bg-primary/5 p-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Ticket Image
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            title="Download image"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <div
          className="p-4 flex justify-center cursor-pointer"
          onClick={() => setShowFullscreen(true)}
        >
          <img
            src={imageUrl}
            alt="Ticket"
            className="max-h-48 rounded border border-border object-contain hover:opacity-80 transition-opacity"
          />
        </div>
      </Card>

      {/* Fullscreen Image Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-h-screen max-w-4xl w-full flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={imageUrl}
              alt="Ticket Fullscreen"
              className="w-full h-full object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
};

