import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2, ZoomIn } from "lucide-react";
import Cropper, { Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface PhotoUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

async function getCroppedWebp(
  imageSrc: string,
  crop: Area,
  maxSize = 512,
  quality = 0.82,
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Image load failed"));
    el.src = imageSrc;
  });

  const outSize = Math.min(maxSize, Math.round(crop.width));
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outSize,
    outSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
      "image/webp",
      quality,
    );
  });
}

export function PhotoUpload({ value, onChange, disabled }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_MB = 5;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const closeCropper = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || !ALLOWED_TYPES.includes(file.type)) {
      toast.error("এই ফরম্যাট সাপোর্ট করে না। JPG, PNG বা WebP ব্যবহার করুন");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`ছবির সাইজ ${sizeMb}MB — সর্বোচ্চ ${MAX_SIZE_MB}MB পর্যন্ত আপলোড করা যাবে`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size === 0) {
      toast.error("ফাইলটি খালি — অন্য একটি ছবি বেছে নিন");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setCropSrc(url);
  };

  const handleConfirmCrop = async () => {
    if (!cropSrc || !croppedArea) return;
    setUploading(true);
    try {
      const blob = await getCroppedWebp(cropSrc, croppedArea);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { error } = await supabase.storage
        .from("contact-photos")
        .upload(fileName, blob, { contentType: "image/webp" });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("contact-photos")
        .getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast.success("ছবি আপলোড হয়েছে! 📸");
      closeCropper();
    } catch {
      toast.error("ছবি আপলোড করতে সমস্যা হয়েছে");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => onChange(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt="প্রোফাইল ফটো"
              className="h-24 w-24 rounded-full object-cover border-2 border-[hsl(var(--heirloom-gold))]/50 shadow-[0_4px_12px_hsl(var(--heirloom-gold-deep)/0.15)]"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                aria-label="ছবি সরান"
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--heirloom-ink))] text-[hsl(var(--heirloom-bg))] shadow-sm hover:opacity-90 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || disabled}
            className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-dashed border-[hsl(var(--heirloom-gold))]/50 bg-[hsl(var(--heirloom-bg))] text-[hsl(var(--heirloom-gold-deep))] hover:bg-[hsl(var(--heirloom-gold))]/10 hover:border-[hsl(var(--heirloom-gold-deep))]/70 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Camera className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-medium">ছবি দিন</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFile}
        className="hidden"
      />
      {!value && !disabled && (
        <p className="text-[10px] text-[hsl(var(--heirloom-ink-mute))] text-center leading-tight">
          JPG, PNG, WebP · সর্বোচ্চ {MAX_SIZE_MB}MB
        </p>
      )}
      {value && !disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-[hsl(var(--heirloom-gold-deep))] hover:underline disabled:opacity-50"
        >
          {uploading ? "আপলোড হচ্ছে..." : "পরিবর্তন করুন"}
        </button>
      )}

      <Dialog open={!!cropSrc} onOpenChange={(o) => { if (!o && !uploading) closeCropper(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ছবি ক্রপ করুন</DialogTitle>
            <DialogDescription className="text-xs">
              ছবিটি টেনে সাজান — ঠিকভাবে ফিট হবে সব জায়গায়
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-72 bg-[hsl(var(--heirloom-ink))]/90 rounded-md overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <ZoomIn className="h-4 w-4 text-[hsl(var(--heirloom-gold-deep))]" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeCropper} disabled={uploading}>
              বাতিল
            </Button>
            <Button type="button" onClick={handleConfirmCrop} disabled={uploading || !croppedArea}>
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> আপলোড হচ্ছে...</>
              ) : (
                "সেভ করুন"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
