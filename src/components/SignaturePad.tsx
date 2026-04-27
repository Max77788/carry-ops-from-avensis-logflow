import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (signature: string) => void;
  label?: string;
}

export const SignaturePad = ({ onSave, label = "Signature" }: SignaturePadProps) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const saveSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataURL = sigCanvas.current.toDataURL();
      onSave(dataURL);
      setIsEmpty(true);
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsEmpty(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-md">
      <div className="bg-muted p-3">
        <h3 className="font-semibold text-foreground">{label}</h3>
        <p className="text-xs text-muted-foreground">Sign with your finger or stylus</p>
      </div>
      
      <div className="relative bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: "w-full h-48 touch-none border-b-2 border-border",
          }}
          onEnd={handleEnd}
          backgroundColor="white"
          penColor="black"
        />
      </div>

      <div className="flex gap-2 bg-card p-3">
        <Button
          onClick={clearSignature}
          variant="outline"
          className="flex-1"
          disabled={isEmpty}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Clear
        </Button>
        <Button
          onClick={saveSignature}
          className="flex-1"
          disabled={isEmpty}
        >
          <Check className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </Card>
  );
};
