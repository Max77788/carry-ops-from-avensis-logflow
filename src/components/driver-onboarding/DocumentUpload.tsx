import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { FileText, Loader2, Camera, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  label: string;
  documentType: "dl" | "medical_card" | "ssn";
  candidateId: string;
  complianceId: string;
  currentFileUrl?: string;
  isVerified?: boolean;
  onUploadComplete: (fileUrl: string) => void;
  onVerificationChange: (verified: boolean) => void;
  showVerification?: boolean; // Optional prop to hide verification checkbox
}

export const DocumentUpload = ({
  label,
  documentType,
  candidateId,
  complianceId,
  currentFileUrl,
  isVerified = false,
  onUploadComplete,
  onVerificationChange,
  showVerification = true, // Default to showing verification
}: DocumentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      await handleUpload(selectedFile);
    }
  };

  const triggerFileInput = () => {
    const input = document.getElementById(
      `file-input-${documentType}`
    ) as HTMLInputElement;
    if (input) input.click();
  };

  const triggerCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setStream(mediaStream);
        setShowCamera(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        toast({
          title: "Camera Error",
          description:
            "Could not access the camera. Please check permissions and try again.",
          variant: "destructive",
        });
        // Fallback to the file input with capture
        const input = document.getElementById(
          `camera-input-${documentType}`
        ) as HTMLInputElement;
        if (input) input.click();
      }
    } else {
      // Fallback for browsers that don't support getUserMedia
      const input = document.getElementById(
        `camera-input-${documentType}`
      ) as HTMLInputElement;
      if (input) input.click();
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const capturedFile = new File([blob], `capture_${Date.now()}.png`, {
              type: "image/png",
            });
            await handleUpload(capturedFile);
            closeCamera();
          }
        }, "image/png");
      }
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setShowCamera(false);
    setStream(null);
  };

  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    // Cleanup function to stop stream when component unmounts or camera is closed
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera, stream]);

  const handleUpload = async (fileToUpload: File) => {
    if (!fileToUpload) return;

    setIsUploading(true);
    try {
      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${candidateId}/${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `driver-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("driver-documents").getPublicUrl(filePath);

      onUploadComplete(publicUrl);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-lg md:max-w-xl lg:max-w-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
            ></video>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeCamera}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 text-white"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex gap-4 mt-4">
            <Button
              onClick={handleCapture}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <Camera className="h-5 w-5 mr-2" />
              Capture Photo
            </Button>
          </div>
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
      )}

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">{label}</Label>
          {currentFileUrl && showVerification && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`verify-${documentType}`}
                checked={isVerified}
                onCheckedChange={(checked) =>
                  onVerificationChange(checked as boolean)
                }
              />
              <label
                htmlFor={`verify-${documentType}`}
                className="text-sm font-medium cursor-pointer"
              >
                Verified
              </label>
            </div>
          )}
        </div>

        {currentFileUrl && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <a
              href={currentFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View Current Document
            </a>
          </div>
        )}

        <div className="space-y-3">
          {/* Hidden file inputs */}
          <input
            id={`file-input-${documentType}`}
            type="file"
            onChange={handleFileChange}
            accept="image/*,.pdf"
            disabled={isUploading}
            className="hidden"
          />
          <input
            id={`camera-input-${documentType}`}
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            disabled={isUploading}
            className="hidden"
          />

          {/* Upload buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={triggerCamera}
              disabled={isUploading}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={triggerFileInput}
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>

          {isUploading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          )}
        </div>
      </div>
    </>
  );
};
