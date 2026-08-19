import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "dark" | "gold";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none dark:focus:ring-offset-charcoal-950",
        {
          "bg-primary-700 text-white hover:bg-primary-800": variant === "primary",
          "bg-primary-100 text-primary-800 hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-200 dark:hover:bg-primary-900/70": variant === "secondary",
          "border border-charcoal-300 bg-white text-charcoal-700 hover:bg-sand dark:border-charcoal-600 dark:bg-charcoal-900 dark:text-charcoal-200 dark:hover:bg-charcoal-800": variant === "outline",
          "text-charcoal-600 hover:bg-sand dark:text-charcoal-300 dark:hover:bg-charcoal-800": variant === "ghost",
          "bg-terracotta-600 text-white hover:bg-terracotta-700": variant === "danger",
          "bg-charcoal-900 text-white hover:bg-charcoal-800 dark:bg-charcoal-800 dark:hover:bg-charcoal-700": variant === "dark",
          "bg-gold-500 text-charcoal-950 hover:bg-gold-400": variant === "gold",
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}