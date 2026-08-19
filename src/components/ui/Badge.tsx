import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-sand text-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-200": variant === "default",
          "bg-olive-100 text-olive-800 dark:bg-olive-900/50 dark:text-olive-300": variant === "success",
          "bg-gold-100 text-gold-800 dark:bg-gold-900/50 dark:text-gold-300": variant === "warning",
          "bg-terracotta-100 text-terracotta-800 dark:bg-terracotta-900/50 dark:text-terracotta-300": variant === "danger",
          "bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-200": variant === "info",
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeProps["variant"]> = {
    CONFIRMED: "success",
    DEPOSIT_PAID: "success",
    COMPLETED: "success",
    PENDING_APPROVAL: "warning",
    QUOTATION_REQUESTED: "info",
    QUOTATION_SENT: "info",
    CANCELLED: "danger",
    REJECTED: "danger",
    AVAILABLE: "success",
    PENDING: "warning",
    UNAVAILABLE: "danger",
    PLANNING: "info",
    ACTIVE: "success",
    TRIAL: "warning",
    EXPIRED: "danger",
    PAST_DUE: "danger",
  };

  return (
    <Badge variant={variantMap[status] || variantMap[status.toLowerCase()] || "default"}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const clamped = Math.max(0, Math.min(5, rating || 0));
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={cn(
            size === "sm" ? "text-sm" : "text-lg",
            star <= Math.round(clamped) ? "text-gold-500" : "text-charcoal-200 dark:text-charcoal-700"
          )}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-sm text-charcoal-600 dark:text-charcoal-300">{clamped.toFixed(1)}</span>
    </div>
  );
}