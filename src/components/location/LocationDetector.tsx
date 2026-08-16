"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";

interface DetectedLocation {
  country: string;
  city?: string;
}

const REVERSE_GEO_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

async function reverseGeocode(lat: number, lng: number): Promise<DetectedLocation | null> {
  try {
    const res = await fetch(`${REVERSE_GEO_URL}?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (!res.ok) return null;
    const data = await res.json();
    const country: string | undefined = data.countryName;
    if (!country) return null;
    const city =
      data.city ||
      data.locality ||
      data.principalSubdivision ||
      undefined;
    return { country, city };
  } catch {
    return null;
  }
}

export function useDetectedLocation() {
  const [detected, setDetected] = useState<DetectedLocation | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "eventicate_loc_detected_v1";
    if (sessionStorage.getItem(key)) return;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (loc) {
          sessionStorage.setItem(key, "1");
          setDetected(loc);
        }
      },
      () => {
        // user denied or unavailable — silently skip
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  return { detected, dismissed, dismiss: () => setDismissed(true) };
}

export function LocationBanner({
  detected,
  onUse,
  onDismiss,
}: {
  detected: DetectedLocation;
  onUse: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-900 dark:bg-primary-900/30">
      <div className="flex items-center gap-2 text-sm text-primary-800 dark:text-primary-200">
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span>
          Detected location: <strong>{detected.city ? `${detected.city}, ` : ""}{detected.country}</strong>.
          <button type="button" onClick={onUse} className="ml-2 font-semibold underline underline-offset-2 hover:text-primary-600">
            Show local providers
          </button>
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}