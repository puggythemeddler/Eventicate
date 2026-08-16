import prisma from "./prisma";

interface MpesaConfig {
  env: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  callbackUrl: string;
  callbackSecret: string;
}

let cachedConfig: MpesaConfig | null = null;
let configLoadedAt = 0;
const CONFIG_TTL_MS = 10_000;

async function loadMpesaConfig(): Promise<MpesaConfig> {
  if (cachedConfig && Date.now() - configLoadedAt < CONFIG_TTL_MS) {
    return cachedConfig;
  }

  let dbConfig: Partial<MpesaConfig> = {};
  try {
    const row = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    if (row) {
      dbConfig = {
        env: row.mpesaEnv || undefined,
        consumerKey: row.mpesaConsumerKey || undefined,
        consumerSecret: row.mpesaConsumerSecret || undefined,
        passkey: row.mpesaPasskey || undefined,
        shortcode: row.mpesaShortcode || undefined,
        callbackUrl: row.mpesaCallbackUrl || undefined,
        callbackSecret: row.mpesaCallbackSecret || undefined,
      };
    }
  } catch {
    // DB unavailable — fall back to env vars.
  }

  const appUrl = process.env.APP_URL || "";
  const config: MpesaConfig = {
    env: dbConfig.env || process.env.MPESA_ENV || "sandbox",
    consumerKey: dbConfig.consumerKey || process.env.MPESA_CONSUMER_KEY || "",
    consumerSecret: dbConfig.consumerSecret || process.env.MPESA_CONSUMER_SECRET || "",
    passkey: dbConfig.passkey || process.env.MPESA_PASSKEY || "",
    shortcode: dbConfig.shortcode || process.env.MPESA_SHORTCODE || "174379",
    callbackUrl: dbConfig.callbackUrl || process.env.MPESA_CALLBACK_URL || `${appUrl}/api/payments/mpesa-callback`,
    callbackSecret: dbConfig.callbackSecret || process.env.MPESA_CALLBACK_SECRET || "",
  };

  cachedConfig = config;
  configLoadedAt = Date.now();
  return config;
}

export function invalidateMpesaConfigCache() {
  cachedConfig = null;
  configLoadedAt = 0;
}

export async function isMpesaConfigured(): Promise<boolean> {
  const cfg = await loadMpesaConfig();
  return Boolean(cfg.consumerKey && cfg.consumerSecret && cfg.passkey);
}

async function baseUrl(): Promise<string> {
  const cfg = await loadMpesaConfig();
  return cfg.env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.startsWith("2547")) {
    // already in international format
  } else if (digits.length === 9 && digits.startsWith("7")) {
    digits = `254${digits}`;
  }
  return digits;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const cfg = await loadMpesaConfig();
  const auth = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64");
  const res = await fetch(`${await baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    throw new Error(`M-Pesa auth failed (${res.status})`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 3599) - 60) * 1000,
  };
  return cachedToken.token;
}

export interface StkPushResult {
  success: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseCode?: string;
  responseDescription?: string;
  error?: string;
}

export async function stkPush(params: {
  amount: number;
  phone: string;
  accountReference: string;
  transactionDesc?: string;
}): Promise<StkPushResult> {
  const cfg = await loadMpesaConfig();
  if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.passkey) {
    return { success: false, error: "M-Pesa is not configured" };
  }

  try {
    const token = await getAccessToken();
    const body = {
      BusinessShortCode: cfg.shortcode,
      Password: Buffer.from(`${cfg.shortcode}${cfg.passkey}${timestamp()}`).toString("base64"),
      Timestamp: timestamp(),
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amount).toString(),
      PartyA: normalizePhone(params.phone),
      PartyB: cfg.shortcode,
      PhoneNumber: normalizePhone(params.phone),
      CallBackURL: cfg.callbackUrl,
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: (params.transactionDesc || "Eventicate payment").slice(0, 13),
    };

    const res = await fetch(`${await baseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      ResponseCode?: string;
      ResponseDescription?: string;
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
    };

    if (data.ResponseCode === "0") {
      return {
        success: true,
        checkoutRequestId: data.CheckoutRequestID,
        merchantRequestId: data.MerchantRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
      };
    }

    return {
      success: false,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      error: data.ResponseDescription || "M-Pesa request failed",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "M-Pesa request failed",
    };
  }
}

export type StkQueryStatus = "COMPLETED" | "FAILED" | "PENDING";

export async function stkQuery(checkoutRequestId: string): Promise<{
  status: StkQueryStatus;
  resultCode?: string;
  resultDesc?: string;
  receipt?: string;
  error?: string;
}> {
  const cfg = await loadMpesaConfig();
  if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.passkey) {
    return { status: "PENDING", error: "M-Pesa is not configured" };
  }

  try {
    const token = await getAccessToken();
    const body = {
      BusinessShortCode: cfg.shortcode,
      Password: Buffer.from(`${cfg.shortcode}${cfg.passkey}${timestamp()}`).toString("base64"),
      Timestamp: timestamp(),
      CheckoutRequestID: checkoutRequestId,
    };

    const res = await fetch(`${await baseUrl()}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      ResultCode?: string;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: { Name: string; Value?: string | number }[] };
    };

    const resultCode = data.ResultCode;
    const item = (name: string) =>
      data.CallbackMetadata?.Item?.find((i) => i.Name === name)?.Value;

    if (resultCode === "0") {
      return {
        status: "COMPLETED",
        resultCode,
        resultDesc: data.ResultDesc,
        receipt: item("MpesaReceiptNumber") ? String(item("MpesaReceiptNumber")) : undefined,
      };
    }

    const failedCodes = ["1032", "1036", "1037", "2001", "1"];
    if (resultCode && failedCodes.includes(resultCode)) {
      return {
        status: "FAILED",
        resultCode,
        resultDesc: data.ResultDesc,
      };
    }

    return {
      status: "PENDING",
      resultCode,
      resultDesc: data.ResultDesc,
    };
  } catch (error) {
    return {
      status: "PENDING",
      error: error instanceof Error ? error.message : "M-Pesa status query failed",
    };
  }
}

export function extractStkCallback(raw: unknown): {
  checkoutRequestId?: string;
  merchantRequestId?: string;
  resultCode?: string;
  resultDesc?: string;
  amount?: number;
  receipt?: string;
  phone?: string;
  transactionDate?: string;
} {
  const body = (raw as { Body?: { stkCallback?: Record<string, unknown> } })?.Body;
  const cb = body?.stkCallback;
  if (!cb) return {};

  const meta = (cb.CallbackMetadata as { Item?: { Name: string; Value?: string | number }[] } | undefined);
  const item = (name: string) => meta?.Item?.find((i) => i.Name === name)?.Value;

  return {
    checkoutRequestId: cb.CheckoutRequestID as string | undefined,
    merchantRequestId: cb.MerchantRequestID as string | undefined,
    resultCode: cb.ResultCode !== undefined ? String(cb.ResultCode) : undefined,
    resultDesc: cb.ResultDesc as string | undefined,
    amount: typeof item("Amount") === "number" ? (item("Amount") as number) : Number(item("Amount")),
    receipt: item("MpesaReceiptNumber") ? String(item("MpesaReceiptNumber")) : undefined,
    phone: item("PhoneNumber") ? String(item("PhoneNumber")) : undefined,
    transactionDate: item("TransactionDate") ? String(item("TransactionDate")) : undefined,
  };
}