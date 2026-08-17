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
          <stop offset="0" stopColor="#6b2918" />
          <stop offset="0.55" stopColor="#c04a1f" />
          <stop offset="1" stopColor="#d76f3f" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${gradientId})`} />
      <rect x="18" y="18" width="8" height="28" rx="2" fill="#ffffff" />
      <rect x="18" y="18" width="28" height="8" rx="2" fill="#ffffff" />
      <rect x="18" y="38" width="28" height="8" rx="2" fill="#ffffff" />
      <path
        d="M32 24 C33.5 28.5, 35.5 30.5, 40 32 C35.5 33.5, 33.5 35.5, 32 40 C30.5 35.5, 28.5 33.5, 24 32 C28.5 30.5, 30.5 28.5, 32 24 Z"
        fill="#f4d4bc"
      />
    </svg>
  );
}

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  showText?: boolean;
  textClassName?: string;
}

export function BrandLogo({
  className,
  markClassName,
  showText = true,
  textClassName,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark className={markClassName} />
      {showText && (
        <span className={cn("text-xl font-bold text-primary-700 dark:text-primary-300", textClassName)}>
          Eventicate
        </span>
      )}
    </span>
  );
}
