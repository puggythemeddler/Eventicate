import { useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          "w-full rounded-lg border border-charcoal-300 bg-white px-3 py-2 text-sm text-charcoal-900 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-charcoal-100",
          "placeholder:text-charcoal-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600",
          error && "border-terracotta-500",
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-terracotta-600">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-lg border border-charcoal-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-charcoal-100",
          "focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "w-full rounded-lg border border-charcoal-300 bg-white px-3 py-2 text-sm text-charcoal-900 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-900 dark:text-charcoal-100",
          "placeholder:text-charcoal-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600",
          className
        )}
        {...props}
      />
    </div>
  );
}