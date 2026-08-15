"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

interface AutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  emptyLabel?: string;
  clearable?: boolean;
}

export function Autocomplete({
  label,
  value,
  onChange,
  options,
  placeholder = "Search...",
  emptyLabel = "No matches found",
  clearable = true,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(input.toLowerCase()) ||
      o.value.toLowerCase().includes(input.toLowerCase())
  );

  useEffect(() => {
    if (!open) setFocusedIndex(-1);
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    setOpen(true);
    if (value) onChange("");
  }

  function selectOption(opt: { value: string; label: string }) {
    onChange(opt.value);
    setInput(opt.label);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filtered.length) {
          selectOption(filtered[focusedIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  function handleClear() {
    onChange("");
    setInput("");
    inputRef.current?.focus();
  }

  const inputId = label ? label.toLowerCase().replace(/\s/g, "-") : undefined;

  return (
    <div ref={wrapperRef} className="relative space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={open || !selected ? input : selected.label}
          onChange={handleInputChange}
          onFocus={() => {
            setOpen(true);
            if (!input && !value) setInput("");
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
            "focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          )}
        />
        {clearable && value && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">{emptyLabel}</div>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(opt);
                }}
                onMouseEnter={() => setFocusedIndex(i)}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-sm transition-colors",
                  focusedIndex === i
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50",
                  opt.value === value && "font-medium"
                )}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
