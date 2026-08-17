import prisma from "./prisma";
import { normalizePhone } from "./mpesa";

interface WhatsAppConfig {
  accessToken: string;
  phoneId: string;
  verifyToken: string;
  businessPhone: string;
}

let cachedConfig: WhatsAppConfig | null = null;
let configLoadedAt = 0;
const CONFIG_TTL_MS = 10_000;

async function loadWhatsAppConfig(): Promise<WhatsAppConfig> {
  if (cachedConfig && Date.now() - configLoadedAt < CONFIG_TTL_MS) {
    return cachedConfig;
  }

  let dbConfig: Partial<WhatsAppConfig> = {};
  try {
    const row = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    if (row) {
      dbConfig = {
        accessToken: row.whatsappAccessToken || undefined,
        phoneId: row.whatsappPhoneId || undefined,
        verifyToken: row.whatsappVerifyToken || undefined,
        businessPhone: row.whatsappBusinessPhone || undefined,
      };
    }
  } catch {
    // DB unavailable — fall back to env vars.
  }

  const config: WhatsAppConfig = {
    accessToken: dbConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneId: dbConfig.phoneId || process.env.WHATSAPP_PHONE_ID || "",
    verifyToken: dbConfig.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || "",
    businessPhone: dbConfig.businessPhone || process.env.WHATSAPP_BUSINESS_PHONE || "",
  };

  cachedConfig = config;
  configLoadedAt = Date.now();
  return config;
}

export function invalidateWhatsAppConfigCache() {
  cachedConfig = null;
  configLoadedAt = 0;
}

export async function isWhatsAppConfigured(): Promise<boolean> {
  const cfg = await loadWhatsAppConfig();
  return Boolean(cfg.accessToken && cfg.phoneId);
}

export function getWhatsAppVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN || "";
}

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

/**
 * Send a text message to a phone number via the WhatsApp Cloud API.
 * Returns { ok, messageId?, error? }.
 */
export async function sendWhatsAppText(params: {
  to: string;
  text: string;
  replyToMessageId?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const cfg = await loadWhatsAppConfig();
  if (!cfg.accessToken || !cfg.phoneId) {
    return { ok: false, error: "WhatsApp is not configured" };
  }

  const to = normalizePhone(params.to);
  if (!to) return { ok: false, error: "Invalid recipient phone number" };

  try {
    const res = await fetch(`${GRAPH_BASE}/${cfg.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: params.text },
        context: params.replyToMessageId ? { message_id: params.replyToMessageId } : undefined,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string; type?: string; code?: number };
    };

    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message || `WhatsApp API error (${res.status})`,
      };
    }

    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "WhatsApp request failed",
    };
  }
}

/**
 * Normalize a raw WhatsApp sender number (e.g. "254700000003" or
 * "whatsapp:+254700000003") into the international digits form we store.
 */
export function normalizeWhatsAppPhone(raw: string): string {
  return normalizePhone(raw.replace(/^whatsapp:/, "").replace(/^\+/, ""));
}