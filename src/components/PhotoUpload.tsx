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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র ছবি আপলোড করুন");
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
    } catch (err) {
      console.error(err);
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
              className="h-24 w-24 rounded-full object-cover border-2 border-primary/30 shadow-md"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
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
            className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-dashed border-primary/30 bg-primary/5 text-primary/60 hover:bg-primary/10 hover:border-primary/50 transition-colors disabled:opacity-50"
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
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          {uploading ? "আপলোড হচ্ছে..." : "পরিবর্তন করুন"}
        </button>
      )}
    </div>
  );
}
