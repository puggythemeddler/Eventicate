// M-Pesa (Daraja STK Push) is integrated for real via src/lib/mpesa.ts.
// PesaPal and Stripe are stubs and are disabled in the payment methods list until integrated.

import { stkPush, stkQuery } from "./mpesa";

export type PaymentGateway = "mpesa" | "pesapal" | "stripe";
export type Currency = "KES" | "UGX" | "TZS" | "USD";

export interface PaymentInitRequest {
  amount: number;
  currency: Currency;
  bookingId: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface PaymentInitResponse {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  checkoutRequestId?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  transactionId: string;
  amount?: number;
  error?: string;
}

async function initiateMpesaPayment(req: PaymentInitRequest): Promise<PaymentInitResponse> {
  if (!req.customerPhone) {
    return { success: false, error: "A phone number is required for M-Pesa" };
  }

  const result = await stkPush({
    amount: req.amount,
    phone: req.customerPhone,
    accountReference: req.bookingId,
    transactionDesc: req.description,
  });

  if (!result.success || !result.checkoutRequestId) {
    return {
      success: false,
      error: result.error || result.responseDescription || "M-Pesa request failed",
    };
  }

  return {
    success: true,
    transactionId: result.checkoutRequestId,
    checkoutRequestId: result.checkoutRequestId,
  };
}

async function checkMpesaStatus(checkoutRequestId: string): Promise<PaymentStatusResponse> {
  const result = await stkQuery(checkoutRequestId);

  if (result.status === "COMPLETED") {
    return {
      success: true,
      status: "COMPLETED",
      transactionId: checkoutRequestId,
    };
  }
  if (result.status === "FAILED") {
    return {
      success: false,
      status: "FAILED",
      transactionId: checkoutRequestId,
      error: result.resultDesc || "M-Pesa payment failed",
    };
  }
  return {
    success: true,
    status: "PENDING",
    transactionId: checkoutRequestId,
    error: result.resultDesc,
  };
}

async function initiatePesapalPayment(): Promise<PaymentInitResponse> {
  return { success: false, error: "PesaPal is not configured" };
}

async function checkPesapalStatus(orderTrackingId: string): Promise<PaymentStatusResponse> {
  return {
    success: false,
    status: "FAILED",
    transactionId: orderTrackingId,
    error: "PesaPal is not configured",
  };
}

async function initiateStripePayment(): Promise<PaymentInitResponse> {
  return { success: false, error: "Stripe is not configured" };
}

async function checkStripeStatus(sessionId: string): Promise<PaymentStatusResponse> {
  return {
    success: false,
    status: "FAILED",
    transactionId: sessionId,
    error: "Stripe is not configured",
  };
}

export async function initiatePayment(
  gateway: PaymentGateway,
  req: PaymentInitRequest
): Promise<PaymentInitResponse> {
  switch (gateway) {
    case "mpesa":
      return initiateMpesaPayment(req);
    case "pesapal":
      return initiatePesapalPayment();
    case "stripe":
      return initiateStripePayment();
    default:
      return { success: false, error: `Unsupported gateway: ${gateway}` };
  }
}

export async function checkPaymentStatus(
  gateway: PaymentGateway,
  transactionId: string
): Promise<PaymentStatusResponse> {
  switch (gateway) {
    case "mpesa":
      return checkMpesaStatus(transactionId);
    case "pesapal":
      return checkPesapalStatus(transactionId);
    case "stripe":
      return checkStripeStatus(transactionId);
    default:
      return { success: false, status: "FAILED", transactionId, error: `Unsupported gateway: ${gateway}` };
  }
}
