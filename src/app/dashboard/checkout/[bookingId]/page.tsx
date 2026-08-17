"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { ArrowLeft, CreditCard, Smartphone, ExternalLink, Loader2, CheckCircle, XCircle } from "lucide-react";

interface BookingData {
  id: string;
  quotedPrice: number | null;
  finalPrice: number | null;
  depositAmount: number | null;
  depositPaid: boolean;
  status: string;
  payments: { id: string; amount: number; status: string; method: string }[];
  event: { title: string };
  provider: { businessName: string; category: string };
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  checkoutRequestId?: string;
  error?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const currency = useCurrency();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollStatus, setPollStatus] = useState<"PENDING" | "COMPLETED" | "FAILED">("PENDING");
  const [pollError, setPollError] = useState("");

  useEffect(() => {
    if (!bookingId) return;
    Promise.all([
      fetch("/api/payments/methods").then((r) => r.json()),
      fetch(`/api/bookings/${bookingId}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load booking (${r.status})`);
        return r.json();
      }),
    ])
      .then(([methodsData, bookingData]) => {
        setMethods(methodsData.methods || []);
        setBooking(bookingData.booking || bookingData);
      })
      .catch(() => setLoadError("Failed to load booking details"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const totalPaid = booking?.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const totalDue = booking?.finalPrice || booking?.quotedPrice || 0;
  const remaining = Math.max(0, totalDue - totalPaid);
  const depositAmount = booking?.depositAmount || 0;
  const depositPaid = booking?.depositPaid || false;
  const [paymentMode, setPaymentMode] = useState<"full" | "deposit" | "remaining">("full");

  useEffect(() => {
    if (depositAmount > 0 && !depositPaid) {
      setPaymentMode("deposit");
    } else if (depositPaid && remaining > 0) {
      setPaymentMode("remaining");
    } else {
      setPaymentMode("full");
    }
  }, [depositAmount, depositPaid, remaining]);

  const methodIcons: Record<string, React.ReactNode> = {
    smartphone: <Smartphone className="h-6 w-6" />,
    "credit-card": <CreditCard className="h-6 w-6" />,
  };

  const getPayAmount = () => {
    if (paymentMode === "deposit") return depositAmount;
    if (paymentMode === "remaining") return remaining;
    return totalDue;
  };

  const pollStatusFn = useCallback(async (checkoutRequestId: string) => {
    const res = await fetch(`/api/payments/status?gateway=mpesa&transactionId=${checkoutRequestId}`);
    const data = await res.json();
    if (data.status === "COMPLETED") {
      setPollStatus("COMPLETED");
      setPolling(false);
      router.refresh();
    } else if (data.status === "FAILED") {
      setPollStatus("FAILED");
      setPollError(data.error || "Payment failed");
      setPolling(false);
    }
  }, [router]);

  useEffect(() => {
    if (!polling || !result?.checkoutRequestId) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (attempts > 30) {
        clearInterval(interval);
        setPolling(false);
        setPollStatus("FAILED");
        setPollError("Payment is taking longer than expected. Check your phone and try again.");
        return;
      }
      pollStatusFn(result.checkoutRequestId!);
    }, 4000);
    return () => clearInterval(interval);
  }, [polling, result, pollStatusFn]);

  const handlePay = async () => {
    if (!selectedMethod || !bookingId) return;
    if (selectedMethod === "mpesa" && !phone.trim()) return;

    setPaying(true);
    setResult(null);
    setPolling(false);

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: selectedMethod,
          bookingId,
          amount: getPayAmount(),
          currency,
          phone: phone.trim() || undefined,
          isDeposit: paymentMode === "deposit",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setResult({ success: false, error: err.error || `Payment request failed (${res.status})` });
        return;
      }

      const data = await res.json();
      setResult(data);

      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.success && data.checkoutRequestId) {
        setPollStatus("PENDING");
        setPolling(true);
      }
    } catch {
      setResult({ success: false, error: "Payment request failed" });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="CUSTOMER" />
        <PageContent>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        </PageContent>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="CUSTOMER" />
        <PageContent>
          <p className="text-gray-500">{loadError || "Booking not found."}</p>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <Link
          href={`/dashboard/bookings/${bookingId}`}
          className="mb-4 flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Booking
        </Link>

        <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardTitle className="mb-1">Booking</CardTitle>
            <p className="text-sm font-medium">{booking.event.title}</p>
            <p className="text-xs text-gray-500">{booking.provider.businessName}</p>
          </Card>
          <Card>
            <CardTitle className="mb-1">Total</CardTitle>
            <p className="text-2xl font-bold text-primary-600">{totalDue ? formatCurrency(totalDue, currency) : "—"}</p>
          </Card>
          <Card>
            <CardTitle className="mb-1">Remaining</CardTitle>
            <p className="text-2xl font-bold">{formatCurrency(remaining, currency)}</p>
            {totalPaid > 0 && (
              <p className="text-xs text-gray-500">{formatCurrency(totalPaid, currency)} already paid</p>
            )}
          </Card>
        </div>

        {depositAmount > 0 && (
          <Card className="mb-6">
            <CardTitle className="mb-3">Payment Options</CardTitle>
            <div className="space-y-2">
              {!depositPaid && (
                <button
                  onClick={() => setPaymentMode("deposit")}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                    paymentMode === "deposit"
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <div>
                    <p className="font-medium">Pay Deposit</p>
                    <p className="text-sm text-gray-500">Pay {formatCurrency(depositAmount, currency)} to secure your booking</p>
                  </div>
                  <span className="text-lg font-bold text-primary-600">{formatCurrency(depositAmount, currency)}</span>
                </button>
              )}
              {depositPaid && remaining > 0 && (
                <button
                  onClick={() => setPaymentMode("remaining")}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                    paymentMode === "remaining"
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <div>
                    <p className="font-medium">Pay Remaining Balance</p>
                    <p className="text-sm text-gray-500">Deposit of {formatCurrency(depositAmount, currency)} already paid</p>
                  </div>
                  <span className="text-lg font-bold text-primary-600">{formatCurrency(remaining, currency)}</span>
                </button>
              )}
              {!depositPaid && (
                <button
                  onClick={() => setPaymentMode("full")}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                    paymentMode === "full"
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <div>
                    <p className="font-medium">Pay Full Amount</p>
                    <p className="text-sm text-gray-500">Pay the full quoted price now</p>
                  </div>
                  <span className="text-lg font-bold text-primary-600">{formatCurrency(totalDue, currency)}</span>
                </button>
              )}
            </div>
          </Card>
        )}

        {remaining <= 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <CardTitle>All payments completed</CardTitle>
              <p className="text-sm text-gray-500">No outstanding balance for this booking.</p>
            </div>
          </Card>
        ) : pollStatus === "COMPLETED" ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <CardTitle>Payment Successful</CardTitle>
              <p className="text-sm text-gray-500">Thank you! Your payment has been received.</p>
              <Button variant="primary" onClick={() => router.push(`/dashboard/bookings/${bookingId}`)}>
                View Booking
              </Button>
            </div>
          </Card>
        ) : pollStatus === "FAILED" ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6">
              <XCircle className="h-12 w-12 text-red-500" />
              <CardTitle>Payment Failed</CardTitle>
              <p className="text-sm text-red-500">{pollError || "The payment was not completed."}</p>
              <Button
                variant="primary"
                onClick={() => {
                  setPollStatus("PENDING");
                  setPollError("");
                  setPolling(false);
                  setResult(null);
                }}
              >
                Try Again
              </Button>
            </div>
          </Card>
        ) : polling ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
              <CardTitle>Waiting for Payment</CardTitle>
              <p className="text-sm text-gray-500">
                Check your phone for the M-Pesa STK push prompt and enter your PIN
                <br />
                to complete the payment.
              </p>
              <p className="text-xs text-gray-400">Checking status every few seconds...</p>
            </div>
          </Card>
        ) : result?.success ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <CardTitle>Payment Initiated</CardTitle>
              <p className="text-sm text-gray-500">
                Transaction ID: {result.transactionId}
              </p>
              {result.checkoutRequestId && (
                <p className="text-xs text-gray-400">Checkout Request: {result.checkoutRequestId}</p>
              )}
              <Button variant="outline" onClick={() => router.refresh()}>
                Check Status
              </Button>
            </div>
          </Card>
        ) : result && !result.success ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6">
              <XCircle className="h-12 w-12 text-red-500" />
              <CardTitle>Payment Failed</CardTitle>
              <p className="text-sm text-red-500">{result.error || "An error occurred"}</p>
              <Button variant="primary" onClick={() => setResult(null)}>
                Try Again
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardTitle className="mb-4">Select Payment Method</CardTitle>
              <div className="space-y-3">
                {methods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                      selectedMethod === method.id
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        selectedMethod === method.id
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {methodIcons[method.icon] || <CreditCard className="h-6 w-6" />}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-gray-500">{method.description}</p>
                    </div>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        selectedMethod === method.id
                          ? "border-primary-500 bg-primary-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedMethod === method.id && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {selectedMethod === "mpesa" && (
              <Card className="mb-6">
                <Input
                  label="M-Pesa Phone Number"
                  type="tel"
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  You will receive an STK push prompt on your phone to complete payment.
                </p>
              </Card>
            )}

            <Button
              onClick={handlePay}
              disabled={!selectedMethod || paying || (selectedMethod === "mpesa" && !phone.trim())}
              className="w-full"
              size="lg"
            >
              {paying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay {formatCurrency(getPayAmount(), currency)}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        )}
      </PageContent>
    </div>
  );
}
