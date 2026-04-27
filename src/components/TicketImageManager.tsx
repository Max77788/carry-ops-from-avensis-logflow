import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, X, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface TicketImageManagerProps {
  imageUrl?: string;
  ticketId: string;
  onImageUpload?: (file: File) => void;
  onImageRemove?: () => void;
  isLoading?: boolean;
}

export const TicketImageManager = ({
  imageUrl,
  ticketId,
  onImageUpload,
  onImageRemove,
  isLoading = false,
}: TicketImageManagerProps) => {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `ticket-${ticketId}.jpg`;
    link.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onImageUpload?.(file);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageRemove?.();
  };

  const displayImage = preview || imageUrl;

  return (
    <>
      {/* Ticket Image Manager Card */}
      <Card className="overflow-hidden shadow-md">
        <div className="bg-primary/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Ticket Image
            </h3>
          </div>
          {displayImage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              title="Download image"
              disabled={isLoading}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {displayImage ? (
            <>
              {/* Current Image Display */}
              <div
                className="flex justify-center cursor-pointer"
                onClick={() => setShowFullscreen(true)}
              >
                <img
                  src={displayImage}
                  alt="Ticket"
                  className="max-h-48 rounded border border-border object-contain hover:opacity-80 transition-opacity"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace Image
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleRemoveImage}
                  disabled={isLoading}
                  title="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* No Image - Upload Prompt */}
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground mb-4">
                  No ticket image uploaded yet
                </p>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            </>
          )}

          {/* Hidden File Input */}
          <Input
            ref={fileInputRef}
            id="ticket-image-manager"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />
        </div>
      </Card>

      {/* Fullscreen Image Modal */}
      {showFullscreen && displayImage && (
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
              src={displayImage}
              alt="Ticket Fullscreen"
              className="w-full h-full object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
};

