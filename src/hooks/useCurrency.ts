"use client";

import { useEffect, useState } from "react";
import { getCurrencyForCountry } from "@/lib/utils";

export function useCurrency(): string {
  const [currency, setCurrency] = useState("KES");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (active) setCurrency(getCurrencyForCountry(data.user?.country));
      } catch {
        // keep default
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return currency;
}