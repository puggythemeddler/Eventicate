"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Loader2, Save, CheckCircle, AlertTriangle } from "lucide-react";

interface PaymentConfig {
  mpesaEnv: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaPasskey: string;
  mpesaShortcode: string;
  mpesaCallbackUrl: string;
  mpesaCallbackSecret: string;
  configured: boolean;
}

export default function PaymentsPage() {
  const [authorized, setAuthorized] = useState(false);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
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
        const res2 = await fetch("/api/admin/payments");
        if (!res2.ok) throw new Error("Failed to load configuration");
        const data = await res2.json();
        setConfig(data);
      } catch {
        setLoadError("Failed to load payment configuration. Please try again.");
      }
    })();
  }, [router]);

  const reload = () => {
    setLoadError("");
    setAuthorized(true);
    fetch("/api/admin/payments")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setLoadError("Failed to load payment configuration. Please try again."));
  };

  const update = (key: keyof PaymentConfig, value: string) => {
    setSaved(false);
    setError("");
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save configuration");
      }
      const data = await res.json();
      setConfig(data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (!authorized) return null;

  if (loadError || !config) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="ADMIN" />
        <PageContent>
          <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Payment Gateway</h1>
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
        <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Payment Gateway</h1>

        <div className="mb-6 flex items-center gap-3">
          {config.configured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-100 dark:bg-olive-900/50 px-3 py-1 text-sm font-medium text-olive-700 dark:text-olive-300">
              <CheckCircle className="h-4 w-4" />
              M-Pesa configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 dark:bg-gold-900/50 px-3 py-1 text-sm font-medium text-gold-700 dark:text-gold-400">
              <AlertTriangle className="h-4 w-4" />
              M-Pesa not configured — payments will fail until credentials are added
            </span>
          )}
        </div>

        <Card className="max-w-2xl">
          <CardTitle className="mb-4">M-Pesa (Daraja)</CardTitle>

          <div className="space-y-4">
            <Select
              label="Environment"
              value={config.mpesaEnv}
              onChange={(e) => update("mpesaEnv", e.target.value)}
              options={[
                { value: "sandbox", label: "Sandbox (test)" },
                { value: "production", label: "Production (live)" },
              ]}
            />

            <Input
              label="Consumer Key"
              placeholder="Paste your Daraja consumer key"
              value={config.mpesaConsumerKey}
              onChange={(e) => update("mpesaConsumerKey", e.target.value)}
            />

            <Input
              label="Consumer Secret"
              type="password"
              placeholder="Paste your Daraja consumer secret"
              value={config.mpesaConsumerSecret}
              onChange={(e) => update("mpesaConsumerSecret", e.target.value)}
            />

            <Input
              label="Passkey"
              type="password"
              placeholder="Lipa Na MPESA Online passkey"
              value={config.mpesaPasskey}
              onChange={(e) => update("mpesaPasskey", e.target.value)}
            />

            <Input
              label="Shortcode"
              placeholder="174379"
              value={config.mpesaShortcode}
              onChange={(e) => update("mpesaShortcode", e.target.value)}
            />

            <Input
              label="Callback URL"
              placeholder="https://eventicate.vercel.app/api/payments/mpesa-callback"
              value={config.mpesaCallbackUrl}
              onChange={(e) => update("mpesaCallbackUrl", e.target.value)}
            />

            <Input
              label="Callback Secret (optional)"
              type="password"
              placeholder="Shared secret verified on M-Pesa callbacks"
              value={config.mpesaCallbackSecret}
              onChange={(e) => update("mpesaCallbackSecret", e.target.value)}
            />
          </div>

          <p className="mt-4 text-xs text-charcoal-500 dark:text-charcoal-400">
            Credentials are stored in the database and applied immediately. Existing values are masked and left blank
            to keep them. Get test credentials at{" "}
            <a
              href="https://developer.safaricom.co.ke/test_credentials"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 hover:underline"
            >
              developer.safaricom.co.ke
            </a>
            .
          </p>

          {error && <p className="mt-3 text-sm text-terracotta-600 dark:text-terracotta-400">{error}</p>}
          {saved && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-olive-700 dark:text-olive-400">
              <CheckCircle className="h-4 w-4" />
              Saved successfully
            </p>
          )}

          <Button className="mt-6" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save Configuration
          </Button>
        </Card>
      </PageContent>
    </div>
  );
}