import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  X,
  Image as ImageIcon,
  Camera,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TicketImageUploadProps {
  onImageSelected?: (file: File) => void;
}

export const TicketImageUpload = ({
  onImageSelected,
}: TicketImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  // Enumerate available cameras
  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to enumerate cameras:", err);
    }
  };

  // Get cameras when component mounts
  useEffect(() => {
    enumerateCameras();
  }, []);

  const startCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: "environment" },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setShowCamera(true);
      setError(null);

      // Set the stream to the video element after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error("Failed to play video:", err);
          });
        }
      }, 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        // Mirror the image (flip horizontally) to match what user sees
        context.scale(-1, 1);
        context.drawImage(videoRef.current, -videoRef.current.videoWidth, 0);

        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "ticket-photo.jpg", {
              type: "image/jpeg",
            });
            setSelectedFile(file);
            setPreview(canvasRef.current!.toDataURL("image/jpeg"));
            stopCamera();
            onImageSelected?.(file);
            setError(null);
          }
        }, "image/jpeg");
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setError(null);
    onImageSelected?.(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="overflow-hidden shadow-md">
      <div className="bg-blue-50 p-4">
        <div className="flex items-center gap-2 text-blue-600">
          <ImageIcon className="h-5 w-5" />
          <h3 className="font-semibold">Upload Ticket Image</h3>
        </div>
        <p className="mt-1 text-xs text-blue-600/70">
          Upload a photo of the ticket to auto-fill details
        </p>
      </div>

      <div className="space-y-4 p-4">
        {/* Camera or File Input */}
        {!showCamera ? (
          <div className="space-y-3">
            {/* Upload Button with Dropdown Menu */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Choose from Files</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={startCamera}>
                    <Camera className="mr-2 h-4 w-4" />
                    <span>Take Photo</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Hidden File Input */}
            <Input
              ref={fileInputRef}
              id="ticket-image"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Camera Selection - Only show when multiple cameras available */}
            {availableCameras.length > 1 && (
              <div>
                <Label htmlFor="camera-select" className="text-sm font-medium">
                  Select Camera
                </Label>
                <Select
                  value={selectedCameraId}
                  onValueChange={setSelectedCameraId}
                >
                  <SelectTrigger id="camera-select" className="mt-2">
                    <SelectValue placeholder="Choose a camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCameras.map((camera) => (
                      <SelectItem key={camera.deviceId} value={camera.deviceId}>
                        {camera.label ||
                          `Camera ${availableCameras.indexOf(camera) + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Camera View */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-100 w-full rounded border border-border bg-black object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Controls */}
            <div className="flex gap-2">
              <Button type="button" onClick={capturePhoto} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
              <Button
                type="button"
                onClick={stopCamera}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Ticket preview"
              className="max-h-40 w-full rounded border border-border object-contain"
            />
            <button
              onClick={handleClear}
              className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="animate-fade-in flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Image Selected Success */}
        {selectedFile && (
          <div className="animate-fade-in flex gap-2 rounded-lg border border-success/30 bg-success/5 p-4">
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-success">
              <p className="font-medium">Image selected</p>
              <p className="text-success/80 truncate">{selectedFile.name}</p>
            </div>
          </div>
        )}

        {/* Clear Button */}
        {selectedFile && (
          <Button onClick={handleClear} variant="outline" className="w-full">
            Clear Image
          </Button>
        )}
      </div>
    </Card>
  );
};
