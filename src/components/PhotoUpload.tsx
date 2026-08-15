import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2, ZoomIn, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface PhotoUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

type Busy = "idle" | "processing" | "uploading" | "replacing" | "removing";

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
    el.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    el.src = imageSrc;
  });

  const outSize = Math.min(maxSize, Math.round(crop.width));
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, outSize, outSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("COMPRESSION_FAILED"))),
      "image/webp",
      quality,
    );
  });
}

/** Map raw errors → Bangla, user-actionable messages */
function friendlyUploadError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err || "")).toLowerCase();
  if (!navigator.onLine) return "ইন্টারনেট সংযোগ নেই — সংযোগ ঠিক হলে আবার চেষ্টা করুন";
  if (msg.includes("compression")) return "ছবিটি প্রসেস করা যায়নি — অন্য একটি ছবি বেছে নিন";
  if (msg.includes("image_load") || msg.includes("canvas"))
    return "ছবিটি খোলা যায়নি — ফাইলটি সম্ভবত নষ্ট";
  if (msg.includes("payload") || msg.includes("too large") || msg.includes("413"))
    return "ছবিটি বেশি বড় — ছোট ছবি বেছে নিন";
  if (msg.includes("unauthor") || msg.includes("403") || msg.includes("permission") || msg.includes("policy"))
    return "আপলোডের অনুমতি নেই — আবার লগইন করে চেষ্টা করুন";
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("timeout"))
    return "নেটওয়ার্ক সমস্যা — কিছুক্ষণ পর আবার চেষ্টা করুন";
  if (msg.includes("mime") || msg.includes("content-type"))
    return "এই ফরম্যাট সাপোর্ট করে না — JPG/PNG/WebP ব্যবহার করুন";
  return "ছবি আপলোড করা যায়নি — আবার চেষ্টা করুন";
}

export function PhotoUpload({ value, onChange, disabled }: PhotoUploadProps) {
  const [busy, setBusy] = useState<Busy>("idle");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isReplacing = !!value; // true means user is swapping an existing photo

  const MAX_SIZE_MB = 5;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const isBusy = busy !== "idle";

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
      toast.error("এই ফরম্যাট সাপোর্ট করে না — JPG, PNG বা WebP ব্যবহার করুন");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`ছবির সাইজ ${sizeMb}MB — সর্বোচ্চ ${MAX_SIZE_MB}MB পর্যন্ত`);
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
    const mode: Busy = isReplacing ? "replacing" : "uploading";
    const toastId = toast.loading(isReplacing ? "ছবি পরিবর্তন হচ্ছে..." : "ছবি আপলোড হচ্ছে...");
    setBusy("processing");
    try {
      const blob = await getCroppedWebp(cropSrc, croppedArea);
      setBusy(mode);
      const fileName = `intake/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { error } = await supabase.storage
        .from("contact-photos")
        .upload(fileName, blob, { contentType: "image/webp" });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("contact-photos")
        .getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast.success(isReplacing ? "ছবি পরিবর্তন হয়েছে ✓" : "ছবি আপলোড হয়েছে ✓", { id: toastId });
      closeCropper();
    } catch (err) {
      toast.error(friendlyUploadError(err), { id: toastId });
    } finally {
      setBusy("idle");
    }
  };

  const handleRemove = async () => {
    const toastId = toast.loading("ছবি সরানো হচ্ছে...");
    setBusy("removing");
    try {
      onChange(null);
      toast.success("ছবি সরানো হয়েছে ✓", { id: toastId });
      setConfirmRemove(false);
    } catch {
      toast.error("ছবি সরানো যায়নি — আবার চেষ্টা করুন", { id: toastId });
    } finally {
      setBusy("idle");
    }
  };

  const overlayLabel =
    busy === "processing" ? "প্রসেস হচ্ছে..." :
    busy === "uploading" ? "আপলোড হচ্ছে..." :
    busy === "replacing" ? "পরিবর্তন হচ্ছে..." :
    busy === "removing" ? "সরানো হচ্ছে..." : "";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt="প্রোফাইল ফটো"
              className="h-24 w-24 rounded-full object-cover border-2 border-heirloom-gold/50 shadow-heirloom-photo"
            />
            {isBusy && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-heirloom-ink/55 backdrop-blur-[1px]">
                <Loader2 className="h-6 w-6 animate-spin text-heirloom-bg" />
              </div>
            )}
            {!disabled && !isBusy && (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                aria-label="ছবি সরান"
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-heirloom-ink text-heirloom-bg shadow-sm hover:opacity-90 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isBusy || disabled}
            className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-dashed border-heirloom-gold/50 bg-heirloom-bg text-heirloom-gold-deep hover:bg-heirloom-gold/10 hover:border-heirloom-gold-deep/70 transition-colors disabled:opacity-60"
          >
            {isBusy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Camera className="h-6 w-6 mb-1" />
                <span className="text-micro font-medium">ছবি দিন</span>
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

      {isBusy && (
        <p className="text-[11px] font-medium text-heirloom-gold-deep">
          {overlayLabel}
        </p>
      )}

      {!isBusy && !value && !disabled && (
        <p className="text-micro text-heirloom-ink-mute text-center leading-tight">
          JPG, PNG, WebP · সর্বোচ্চ {MAX_SIZE_MB}MB
        </p>
      )}

      {!isBusy && value && !disabled && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-heirloom-gold-deep hover:underline"
          >
            পরিবর্তন করুন
          </button>
          <span className="text-heirloom-ink-mute/50">·</span>
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <Trash2 className="h-3 w-3" /> সরান
          </button>
        </div>
      )}

      <Dialog open={!!cropSrc} onOpenChange={(o) => { if (!o && !isBusy) closeCropper(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ছবি ক্রপ করুন</DialogTitle>
            <DialogDescription className="text-xs">
              ছবিটি টেনে সাজান — ঠিকভাবে ফিট হবে সব জায়গায়
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-72 bg-heirloom-ink/90 rounded-md overflow-hidden">
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
            {isBusy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-heirloom-ink/60 backdrop-blur-[1px]">
                <Loader2 className="h-6 w-6 animate-spin text-heirloom-bg" />
                <span className="text-xs text-heirloom-bg">{overlayLabel}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <ZoomIn className="h-4 w-4 text-heirloom-gold-deep" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
              disabled={isBusy}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeCropper} disabled={isBusy}>
              বাতিল
            </Button>
            <Button type="button" onClick={handleConfirmCrop} disabled={isBusy || !croppedArea}>
              {isBusy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {overlayLabel || "অপেক্ষা..."}</>
              ) : (
                "সেভ করুন"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRemove} onOpenChange={(o) => { if (!isBusy) setConfirmRemove(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ছবিটি সরাব?</AlertDialogTitle>
            <AlertDialogDescription>
              প্রোফাইল ছবি সরিয়ে ফেলা হবে। পরে আবার নতুন ছবি দিতে পারবেন।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>থাক</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy === "removing" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> সরানো হচ্ছে...</>
              ) : (
                "হ্যাঁ, সরাই"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
