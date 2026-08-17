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
          "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200": variant === "default",
          "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300": variant === "success",
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300": variant === "warning",
          "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300": variant === "danger",
          "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300": variant === "info",
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
  };

  return (
    <Badge variant={variantMap[status] || "default"}>
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
            star <= Math.round(clamped) ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"
          )}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">{clamped.toFixed(1)}</span>
    </div>
  );
}
