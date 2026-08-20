"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

interface LogoConfig {
  logoLight: string | null;
  logoDark: string | null;
  logoInvoice: string | null;
  appName: string;
}

type LogoType = "logoLight" | "logoDark" | "logoInvoice";

const logoLabels: Record<LogoType, string> = {
  logoLight: "Light Mode Logo",
  logoDark: "Dark Mode Logo",
  logoInvoice: "Invoice/Document Logo",
};

export default function BrandingPage() {
  const [authorized, setAuthorized] = useState(false);
  const [config, setConfig] = useState<LogoConfig | null>(null);
  const [uploading, setUploading] = useState<LogoType | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const lightRef = useRef<HTMLInputElement>(null);
  const darkRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/session");
      const { user } = await res.json();
      if (!user || user.role !== "ADMIN") {
        router.push("/auth/login");
        return;
      }
      setAuthorized(true);
      try {
        const res2 = await fetch("/api/admin/logos");
        if (!res2.ok) throw new Error("Failed to load");
        const data = await res2.json();
        setConfig(data);
      } catch {
        setLoadError("Failed to load branding configuration. Please try again.");
      }
    })();
  }, [router]);

  const reload = () => {
    setLoadError("");
    setActionError("");
    fetch("/api/admin/logos")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setLoadError("Failed to load branding configuration. Please try again."));
  };

  const handleUpload = async (type: LogoType) => {
    const input = type === "logoLight" ? lightRef : type === "logoDark" ? darkRef : invoiceRef;
    const file = input.current?.files?.[0];
    if (!file) return;

    setUploading(type);
    setActionError("");
    const formData = new FormData();
    formData.append(type, file);

    const res = await fetch("/api/admin/logos", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setConfig((prev) => prev ? { ...prev, ...data } : null);
    } else {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error || "Failed to upload logo.");
    }
    setUploading(null);
    if (input.current) input.current.value = "";
  };

  const handleDelete = async (type: LogoType) => {
    if (!window.confirm("Remove this logo? You can upload a new one at any time.")) return;
    const res = await fetch(`/api/admin/logos?type=${type}`, { method: "DELETE" });
    if (res.ok) {
      setConfig((prev) => prev ? { ...prev, [type]: null } : null);
    } else {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error || "Failed to remove logo.");
    }
  };

  if (!authorized) return null;

  if (loadError || !config) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="ADMIN" />
        <PageContent>
          <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Branding</h1>
          <Card>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-terracotta-600" />
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                {loadError || "Failed to load configuration."}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={reload}>
                  Retry
                </Button>
                <Button variant="outline" onClick={() => router.push("/admin")}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Branding</h1>

        {actionError && (
          <div className="mb-4 rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-400">
            {actionError}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {(["logoLight", "logoDark", "logoInvoice"] as LogoType[]).map((type) => (
            <Card key={type}>
              <CardTitle className="mb-4">{logoLabels[type]}</CardTitle>

              <div className="mb-4 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-charcoal-300 dark:border-charcoal-700 bg-sand dark:bg-charcoal-800">
                {config[type] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config[type]!}
                    alt={logoLabels[type]}
                    className="max-h-28 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-charcoal-400 dark:text-charcoal-500">No logo uploaded</span>
                )}
              </div>

              <div className="space-y-2">
                <input
                  ref={type === "logoLight" ? lightRef : type === "logoDark" ? darkRef : invoiceRef}
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-charcoal-500 dark:text-charcoal-400 file:mr-2 file:rounded file:border-0 file:bg-primary-50 file:px-2 file:py-1 file:text-sm file:font-medium file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300"
                  onChange={() => handleUpload(type)}
                />
                {uploading === type && (
                  <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Uploading...</p>
                )}
                {config[type] && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDelete(type)}
                  >
                    Remove Logo
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </PageContent>
    </div>
  );
}
