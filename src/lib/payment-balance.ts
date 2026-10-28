/** Only settled payments reduce a booking's outstanding balance. */
export function settledPaymentTotal(payments: { amount: number; status: string }[]): number {
  return Math.round(payments.reduce((sum, payment) =>
    payment.status === "DEPOSIT_PAID" || payment.status === "FULLY_PAID"
      ? sum + payment.amount : sum, 0) * 100) / 100;
}
