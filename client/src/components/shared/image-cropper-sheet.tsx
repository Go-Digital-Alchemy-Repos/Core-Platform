import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import imageCompression from "browser-image-compression";
import "react-image-crop/dist/ReactCrop.css";
import { Loader2, CropIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface ImageCropperSheetProps {
  imageSrc: string | null;
  fileName?: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

function makeInitialCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
    width,
    height
  );
}

async function getCroppedFile(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<File> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Could not crop image")); return; }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.95
    );
  });
}

export function ImageCropperSheet({
  imageSrc,
  fileName = "avatar.jpg",
  onConfirm,
  onCancel,
}: ImageCropperSheetProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(makeInitialCrop(width, height));
  }, []);

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedFile(imgRef.current, completedCrop, fileName);
      const compressed = await imageCompression(cropped, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/jpeg",
        initialQuality: 0.88,
      });
      const compressedFile = new File([compressed], fileName.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });
      onConfirm(compressedFile);
    } catch (err) {
      console.error("[ImageCropper] error:", err);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Sheet open={!!imageSrc} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg z-[1300]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CropIcon className="h-4 w-4" />
            Crop Photo
          </SheetTitle>
          <SheetDescription>
            Drag the handles to adjust the crop area, then click Apply.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {imageSrc && (
            <div className="flex items-center justify-center rounded-lg overflow-hidden bg-muted/50 p-2">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                keepSelection
                minWidth={50}
                minHeight={50}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[400px] max-w-full object-contain"
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center mt-3">
            Your photo will be compressed to under 2 MB automatically.
          </p>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!completedCrop || processing}
            data-testid="button-apply-crop"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CropIcon className="h-4 w-4 mr-2" />
            )}
            Apply &amp; Upload
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
