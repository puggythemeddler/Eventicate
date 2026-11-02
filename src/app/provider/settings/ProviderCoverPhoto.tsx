"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ProviderCoverPhotoProps {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

export function ProviderCoverPhoto({ value, onChange, onUploadingChange }: ProviderCoverPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const previewSrc = localPreview || value;

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setError("");
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    setUploading(true);
    onUploadingChange(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload?type=providers", { method: "POST", body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.url !== "string") {
        throw new Error(result.error || "Upload failed. Check your connection and try again.");
      }
      onChange(result.url);
      setLocalPreview(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="cover-photo-heading">
      <div>
        <h3 id="cover-photo-heading" className="text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">Cover photo</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">
          Choose a wide photo of your venue, setup, food or equipment. It appears on your profile and in search results.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="mb-2 text-xs font-medium text-charcoal-600 dark:text-charcoal-300">Profile banner preview</p>
          <div className="relative aspect-[16/6] overflow-hidden rounded-lg bg-sand dark:bg-charcoal-800">
            {previewSrc ? (
              <Image src={previewSrc} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, 60vw" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-charcoal-500 dark:text-charcoal-400">Your cover photo will appear here</div>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-charcoal-600 dark:text-charcoal-300">Search card crop</p>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sand dark:bg-charcoal-800">
            {previewSrc ? (
              <Image src={previewSrc} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, 40vw" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-charcoal-500 dark:text-charcoal-400">Search listings use a closer crop</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="sr-only" aria-label="Choose a cover photo" />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />}
          {uploading ? "Uploading photo…" : previewSrc ? "Replace photo" : "Upload a cover photo"}
        </Button>
        {value && !uploading && (
          <Button type="button" variant="ghost" onClick={() => { onChange(""); setLocalPreview(null); setError(""); }}>
            <X className="mr-1 h-4 w-4" aria-hidden="true" /> Remove photo
          </Button>
        )}
        <span className="text-xs text-charcoal-500 dark:text-charcoal-400">JPG, PNG or WebP · up to 10 MB</span>
      </div>
      {uploading && <p role="status" className="text-sm text-charcoal-600 dark:text-charcoal-300">Uploading to your Cloudinary library…</p>}
      {error && <p role="alert" className="text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
    </section>
  );
}
