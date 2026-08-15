// REAL INTEGRATION: Replace stubs with actual SDK calls. See DOCUMENTATION.md for setup

export type PaymentGateway = "mpesa" | "pesapal" | "stripe";
export type Currency = "KES" | "USD";

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
  console.log(`STK Push sent to ${req.customerPhone} for KES ${req.amount}`);
  return {
    success: true,
    transactionId: `MP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    checkoutRequestId: `CR-${Date.now()}`,
  };
}

async function checkMpesaStatus(_checkoutRequestId: string): Promise<PaymentStatusResponse> {
  void _checkoutRequestId;
  return {
    success: true,
    status: "COMPLETED",
    transactionId: `MP-${Date.now()}`,
  };
}

async function initiatePesapalPayment(_req: PaymentInitRequest): Promise<PaymentInitResponse> {
  void _req;
  const orderTrackingId = `PP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    success: true,
    transactionId: orderTrackingId,
    redirectUrl: `/api/payments/pesapal-callback?order_tracking_id=${orderTrackingId}`,
  };
}

async function checkPesapalStatus(orderTrackingId: string): Promise<PaymentStatusResponse> {
  return {
    success: true,
    status: "COMPLETED",
    transactionId: orderTrackingId,
  };
}

async function initiateStripePayment(_req: PaymentInitRequest): Promise<PaymentInitResponse> {
  void _req;
  return {
    success: true,
    transactionId: `cs_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    redirectUrl: `/checkout/session-complete?session_id=cs_test_${Date.now()}`,
  };
}

async function checkStripeStatus(sessionId: string): Promise<PaymentStatusResponse> {
  return {
    success: true,
    status: "COMPLETED",
    transactionId: sessionId,
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
      return initiatePesapalPayment(req);
    case "stripe":
      return initiateStripePayment(req);
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
