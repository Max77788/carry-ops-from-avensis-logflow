import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanLine, Camera, X, SwitchCamera } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [hasScanned, setHasScanned] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    const initCameras = async () => {
      try {
        // Request camera permission explicitly first
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        // Stop the stream after getting permission
        stream.getTracks().forEach((track) => track.stop());

        const devices = await Html5Qrcode.getCameras();

        if (!devices || devices.length === 0) {
          throw new Error("No cameras found");
        }

        setCameras(devices);

        let defaultCameraId = devices[0].id;

        const backCamera = devices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment")
        );

        if (backCamera) {
          defaultCameraId = backCamera.id;
        } else if (devices.length > 1) {
          defaultCameraId = devices[devices.length - 1].id;
        }

        setSelectedCamera(defaultCameraId);
      } catch (err: any) {
        console.error("Failed to get cameras:", err);
        let errorMsg = "Camera access denied or unavailable";

        if (err.name === "NotAllowedError") {
          errorMsg =
            "Camera permission denied. Please allow camera access in your browser settings.";
        } else if (err.name === "NotFoundError") {
          errorMsg = "No camera found on this device.";
        } else if (err.name === "NotReadableError") {
          errorMsg = "Camera is already in use by another application.";
        } else if (err.name === "SecurityError") {
          errorMsg = "Camera access requires HTTPS connection.";
        }

        setError(errorMsg);
      }
    };

    initCameras();

    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!selectedCamera) return;

    const startScanner = async () => {
      try {
        await stopScanner();

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        // Create a flag to prevent multiple detections
        let isProcessing = false;

        await scanner.start(
          selectedCamera,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Only process the scan once and prevent duplicate detections
            if (!hasScanned && !isProcessing) {
              isProcessing = true;
              console.log("QR Code detected:", decodedText);
              setHasScanned(true);

              // Stop scanner immediately before calling onScan
              stopScanner().then(() => {
                onScan(decodedText);
              });
            }
          },
          (errorMessage) => {
            if (!errorMessage.includes("NotFoundException")) {
              console.warn("QR Scan error:", errorMessage);
            }
          }
        );
        setIsScanning(true);
        setError(null);
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        const errorMsg = err.message || "Camera access denied or unavailable";
        setError(errorMsg);
      }
    };

    startScanner();
  }, [selectedCamera, hasScanned]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      setIsScanning(false);
      scannerRef.current = null;
    }
  };

  const handleClose = async () => {
    await stopScanner();
    setHasScanned(false);
    onClose();
  };

  const handleRetry = async () => {
    setError(null);
    setHasScanned(false);
    setCameras([]);
    setSelectedCamera("");

    // Retry camera initialization
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((track) => track.stop());

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("No cameras found");
      }

      setCameras(devices);
      setSelectedCamera(devices[0].id);
    } catch (err: any) {
      console.error("Retry failed:", err);
      let errorMsg = "Camera access denied or unavailable";

      if (err.name === "NotAllowedError") {
        errorMsg =
          "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found on this device.";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Camera is already in use by another application.";
      } else if (err.name === "SecurityError") {
        errorMsg = "Camera access requires HTTPS connection.";
      }

      setError(errorMsg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg overflow-hidden shadow-lg">
          <div className="relative bg-card p-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Scan QR Code
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Position the QR code within the frame
              </p>
            </div>

            {cameras.length > 1 && (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <SwitchCamera className="h-5 w-5 text-muted-foreground" />
                  <Select
                    value={selectedCamera}
                    onValueChange={setSelectedCamera}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map((camera, index) => (
                        <SelectItem key={camera.id} value={camera.id}>
                          {camera.label || `Camera ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {error ? (
              <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-8 text-center">
                <p className="mb-4 font-semibold text-destructive">{error}</p>
                <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                  <p>💡 Troubleshooting tips:</p>
                  <ul className="ml-4 space-y-1 text-left">
                    <li>
                      <b>
                        <u>
                          • MOST COMMON FIX: Pick the other camera and press
                          "retry" below
                        </u>
                      </b>
                    </li>
                    <li>
                      • Check if your browser has camera permission enabled
                    </li>
                    <li>• Ensure no other app is using the camera</li>
                    <li>• Try using HTTPS connection</li>
                    <li>• Refresh the page and try again</li>
                  </ul>
                </div>
                <div className="flex justify-center gap-2">
                  <Button onClick={handleRetry} className="flex-1">
                    Retry
                  </Button>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div
                  id="qr-reader"
                  className="overflow-hidden rounded-lg border-2 border-primary"
                />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <ScanLine className="h-8 w-8 animate-pulse text-primary" />
                </div>
              </div>
            )}

            <div className="mt-4 text-center">
              <Button
                onClick={handleClose}
                variant="secondary"
                className="w-full"
              >
                Cancel Scan
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
