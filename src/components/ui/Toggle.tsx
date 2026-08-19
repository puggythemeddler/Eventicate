import { cn } from "@/lib/utils";

interface ToggleProps {
  enabled: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function Toggle({ enabled, onClick, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
        enabled ? "bg-olive-500" : "bg-charcoal-300 dark:bg-charcoal-600",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}
