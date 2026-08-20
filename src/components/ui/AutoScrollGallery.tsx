"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AutoScrollGalleryProps {
  images: string[];
  alt?: string;
  intervalMs?: number;
  aspectClass?: string;
  className?: string;
}

export function AutoScrollGallery({
  images,
  alt = "",
  intervalMs = 3000,
  aspectClass = "h-40 w-full",
  className,
}: AutoScrollGalleryProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback(
    (i: number) => {
      const el = trackRef.current;
      if (!el || images.length === 0) return;
      const target = Math.max(0, Math.min(i, images.length - 1));
      el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
      setIndex(target);
    },
    [images.length]
  );

  const next = useCallback(() => {
    if (images.length === 0) return;
    scrollToIndex(index + 1 >= images.length ? 0 : index + 1);
  }, [index, images.length, scrollToIndex]);

  const prev = useCallback(() => {
    if (images.length === 0) return;
    scrollToIndex(index - 1 < 0 ? images.length - 1 : index - 1);
  }, [index, images.length, scrollToIndex]);

  useEffect(() => {
    if (paused || images.length < 2) return;
    const id = window.setInterval(next, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, images.length, intervalMs, next]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || images.length === 0) return;
    const onScroll = () => {
      const w = el.clientWidth || 1;
      setIndex(Math.round(el.scrollLeft / w));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div
      className={cn("group relative overflow-hidden rounded-lg", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div ref={trackRef} className={cn("flex snap-x snap-mandatory overflow-x-auto scroll-smooth", aspectClass)}>
        {images.map((src, i) => (
          <div key={src + i} className="w-full shrink-0 snap-center">
            <Image
              src={src}
              alt={alt || `Image ${i + 1} of ${images.length}`}
              width={800}
              height={450}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/60 focus:opacity-100 group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90"
                )}
              />
            ))}
          </div>
          <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
}