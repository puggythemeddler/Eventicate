"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";

interface ImageUploaderProps {
  type: string;
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}

export function ImageUploader({ type, value, onChange, label = "Images" }: ImageUploaderProps) {
  const [pending, setPending] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError(null);
    const withPreviews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPending((prev) => [...prev, ...withPreviews]);

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const item of withPreviews) {
        const fd = new FormData();
        fd.append("file", item.file);
        const res = await fetch(`/api/upload?type=${encodeURIComponent(type)}`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed (${res.status})`);
        }
        const data = await res.json();
        uploaded.push(data.url);
      }
      onChange([...value, ...uploaded]);
      setPending([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeUploaded(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function removePending(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="sm:col-span-2">
      <label className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="block w-full text-sm text-charcoal-500 dark:text-charcoal-400 file:mr-2 file:rounded file:border-0 file:bg-primary-50 file:px-2 file:py-1 file:text-sm file:font-medium file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300"
      />
      {uploading && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-500 dark:text-charcoal-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Uploading images...
        </p>
      )}
      {error && <p className="mt-1 text-sm text-terracotta-600">{error}</p>}
      {(value.length > 0 || pending.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {value.map((src, i) => (
            <div key={src} className="relative">
              <Image
                src={src}
                alt={`Uploaded image ${i + 1}`}
                width={72}
                height={72}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeUploaded(i)}
                aria-label="Remove image"
                className="absolute -right-1.5 -top-1.5 rounded-full bg-terracotta-600 p-0.5 text-white shadow hover:bg-terracotta-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {pending.map((item, i) => (
            <div key={item.preview} className="relative opacity-70">
              <Image
                src={item.preview}
                alt={`New image ${i + 1}`}
                width={72}
                height={72}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removePending(i)}
                aria-label="Remove pending image"
                className="absolute -right-1.5 -top-1.5 rounded-full bg-charcoal-700 p-0.5 text-white shadow hover:bg-charcoal-800"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length + pending.length === 0 && (
        <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-400 dark:text-charcoal-500">
          <ImagePlus className="h-3.5 w-3.5" />
          No images yet. Upload photos to showcase this item.
        </p>
      )}
    </div>
  );
}