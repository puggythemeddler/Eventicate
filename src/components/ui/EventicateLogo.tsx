"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface LogoConfig {
  logoLight: string | null;
  logoDark: string | null;
}

interface EventicateLogoProps {
  className?: string;
  showText?: boolean;
}

export function EventicateLogo({ className, showText }: EventicateLogoProps) {
  const { resolved } = useTheme();
  const [config, setConfig] = useState<LogoConfig | null>(null);

  useEffect(() => {
    fetch("/api/admin/logos")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const logoSrc = resolved === "dark"
    ? config?.logoDark || config?.logoLight
    : config?.logoLight || config?.logoDark;

  if (logoSrc && !showText) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt="Eventicate"
        className={cn("h-12 w-auto object-contain", className)}
      />
    );
  }

  return <BrandLogo className={className} showText={showText} />;
}
