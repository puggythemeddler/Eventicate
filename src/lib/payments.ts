export type PaymentGateway = "mpesa" | "pesapal" | "stripe";
export type Currency = "KES" | "USD";

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
