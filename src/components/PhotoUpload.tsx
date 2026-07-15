import { useState, useRef } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

async function compressImage(file: File, maxWidth = 400, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;

      // Scale down if larger than maxWidth
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      
      // Use high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression failed"));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

export function PhotoUpload({ value, onChange, disabled }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE_MB = 5;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র ছবি আপলোড করুন (JPG, PNG, WebP)");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
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

    setUploading(true);
    try {
      // Compress before upload
      const compressed = await compressImage(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

      const { error } = await supabase.storage
        .from("contact-photos")
        .upload(fileName, compressed, { contentType: "image/webp" });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("contact-photos")
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
      toast.success("ছবি আপলোড হয়েছে! 📸");
    } catch {
      // Don't leak raw upload error / storage URLs into the console
      toast.error("ছবি আপলোড করতে সমস্যা হয়েছে");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

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
    </div>
  );
}
