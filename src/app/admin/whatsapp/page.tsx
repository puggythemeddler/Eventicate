"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Save, CheckCircle, AlertTriangle } from "lucide-react";

interface WhatsAppConfig {
  whatsappAccessToken: string;
  whatsappPhoneId: string;
  whatsappVerifyToken: string;
  whatsappBusinessPhone: string;
  configured: boolean;
}

export default function WhatsAppPage() {
  const [authorized, setAuthorized] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
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
      fetch("/api/admin/whatsapp")
        .then((r) => r.json())
        .then(setConfig);
    })();
  }, [router]);

  const update = (key: keyof WhatsAppConfig, value: string) => {
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
      const res = await fetch("/api/admin/whatsapp", {
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

  if (!authorized || !config) return null;

  const webhookUrl = "https://eventicate-api.onrender.com/api/whatsapp/webhook";

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">WhatsApp Messaging</h1>

        <div className="mb-6 flex items-center gap-3">
          {config.configured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-100 dark:bg-olive-900/50 px-3 py-1 text-sm font-medium text-olive-700 dark:text-olive-300">
              <CheckCircle className="h-4 w-4" />
              WhatsApp connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 dark:bg-gold-900/50 px-3 py-1 text-sm font-medium text-gold-700 dark:text-gold-400">
              <AlertTriangle className="h-4 w-4" />
              WhatsApp not connected — in-app messages stay in-app until configured
            </span>
          )}
        </div>

        <Card className="max-w-2xl">
          <CardTitle className="mb-4">WhatsApp Business Cloud API</CardTitle>

          <div className="space-y-4">
            <Input
              label="Access Token"
              type="password"
              placeholder="Paste your permanent system user token"
              value={config.whatsappAccessToken}
              onChange={(e) => update("whatsappAccessToken", e.target.value)}
            />

            <Input
              label="Phone Number ID"
              placeholder="e.g. 123456789012345"
              value={config.whatsappPhoneId}
              onChange={(e) => update("whatsappPhoneId", e.target.value)}
            />

            <Input
              label="Verify Token (webhook secret)"
              type="password"
              placeholder="Your own secret string"
              value={config.whatsappVerifyToken}
              onChange={(e) => update("whatsappVerifyToken", e.target.value)}
            />

            <Input
              label="Business Phone Number (optional)"
              placeholder="e.g. 254712345678"
              value={config.whatsappBusinessPhone}
              onChange={(e) => update("whatsappBusinessPhone", e.target.value)}
            />
          </div>

          <div className="mt-4 rounded-lg border border-charcoal-200 dark:border-charcoal-800 bg-sand dark:bg-charcoal-800 p-3">
            <p className="text-xs font-medium text-charcoal-600 dark:text-charcoal-300">
              Webhook URL (register in Meta App Dashboard)
            </p>
            <code className="mt-1 block break-all text-xs text-primary-600 dark:text-primary-400">
              {webhookUrl}
            </code>
          </div>

          <p className="mt-4 text-xs text-charcoal-500 dark:text-charcoal-400">
            When connected, messages sent in the app are also delivered to the recipient&apos;s WhatsApp number, and
            replies from WhatsApp come back into the same conversation here. Credentials are stored in the database and
            applied immediately; existing values are masked and left blank to keep them. Set these up at{" "}
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 hover:underline"
            >
              developers.facebook.com
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