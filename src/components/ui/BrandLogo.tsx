import { useId } from "react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  const gradientId = useId().replace(/[:]/g, "");
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#292624" />
          <stop offset="0.6" stopColor="#573426" />
          <stop offset="1" stopColor="#855033" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="12" fill={`url(#${gradientId})`} />
      <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#bb8b33" strokeWidth="1.5" opacity="0.55" />
      <rect x="18" y="18" width="8" height="28" rx="2" fill="#faf7f2" />
      <rect x="18" y="18" width="28" height="8" rx="2" fill="#faf7f2" />
      <rect x="18" y="38" width="28" height="8" rx="2" fill="#faf7f2" />
      <path
        d="M32 24 C33.5 28.5, 35.5 30.5, 40 32 C35.5 33.5, 33.5 35.5, 32 40 C30.5 35.5, 28.5 33.5, 24 32 C28.5 30.5, 30.5 28.5, 32 24 Z"
        fill="#bb8b33"
      />
    </svg>
  );
}

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  showText?: boolean;
  textClassName?: string;
  tone?: "dark" | "light";
}

export function BrandLogo({
  className,
  markClassName,
  showText = true,
  textClassName,
  tone = "dark",
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark className={markClassName} />
      {showText && (
        <span
          className={cn(
            "font-display text-xl font-semibold tracking-tight",
            tone === "dark" ? "text-charcoal-900 dark:text-charcoal-100" : "text-cream",
            textClassName
          )}
        >
          Eventicate
        </span>
      )}
    </span>
  );
}