"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { ArrowLeft, Loader2, FileSignature, CheckCircle } from "lucide-react";

interface BookingData {
  id: string;
  quotedPrice: number | null;
  finalPrice: number | null;
  depositAmount: number | null;
  status: string;
  event: { title: string };
  provider: { businessName: string };
  documents: { id: string; type: string; documentNumber: string; total: number; depositRequired: number | null; terms: string | null; lineItems: string }[];
  agreements: { id: string; customerName: string; signedAt: string; terms: string; totalAmount: number; depositAmount: number | null }[];
}

export default function AgreementPage() {
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;
  const currency = useCurrency();

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    if (!bookingId) return;
    Promise.all([
      fetch(`/api/bookings/${bookingId}`).then((r) => {
        if (!r.ok) throw new Error("Booking could not be loaded");
        return r.json();
      }),
      fetch("/api/auth/session").then((r) => {
        if (!r.ok) throw new Error("Session could not be loaded");
        return r.json();
      }),
    ])
      .then(([bookingData, sessionData]) => {
        const b = bookingData.booking;
        if (!b?.id || !b.provider || !b.event) throw new Error("Booking could not be loaded");
        setBooking(b);
        if (sessionData.user) {
          setCustomerName(`${sessionData.user.firstName} ${sessionData.user.lastName}`.trim());
          setCustomerEmail(sessionData.user.email);
        }
      })
      .catch(() => setError("Failed to load booking"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const quoteDoc = booking?.documents?.find((d) => d.type === "QUOTE");
  const totalAmount = booking?.finalPrice ?? booking?.quotedPrice ?? 0;
  const depositAmount = booking?.depositAmount ?? quoteDoc?.depositRequired ?? 0;
  const hasAgreement = (booking?.agreements?.length ?? 0) > 0;
  const signedAgreement = booking?.agreements?.[0];
  const canSign = totalAmount > 0 && !!quoteDoc?.terms?.trim() && Math.abs(quoteDoc.total - totalAmount) <= 0.001
    && depositAmount >= 0 && depositAmount <= totalAmount
    && !["CANCELLED", "REJECTED", "COMPLETED"].includes(booking?.status ?? "");

  const parseLineItems = (json: string) => {
    try {
      const items = JSON.parse(json) as unknown;
      if (!Array.isArray(items)) return [];
      return items.filter((item): item is { description: string; quantity: number; unitPrice: number; total: number } =>
        !!item && typeof item.description === "string" && Number.isFinite(item.quantity)
          && Number.isFinite(item.unitPrice) && Number.isFinite(item.total));
    } catch {
      return [];
    }
  };

  const termsText = quoteDoc?.terms ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature.trim() || !canSign) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          documentId: quoteDoc!.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          customerAddress: customerAddress.trim() || undefined,
          signature: signature.trim(),
          terms: termsText,
          totalAmount,
          depositAmount: depositAmount > 0 ? depositAmount : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push(`/dashboard/bookings/${bookingId}`), 2000);
      } else {
        setError(data.error || "Failed to submit agreement");
      }
    } catch {
      setError("Failed to submit agreement");
    } finally {
      setSubmitting(false);
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
          <Card>
            <p role="alert">{error || "Booking not found."}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try again</Button>
            <Link href="/dashboard/bookings" className="ml-4 underline underline-offset-4">Back to bookings</Link>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="CUSTOMER" />
        <PageContent>
          <Card>
            <div className="flex flex-col items-center gap-4 py-12">
              <CheckCircle className="h-16 w-16 text-olive-600 dark:text-olive-400" />
              <CardTitle>Agreement Signed Successfully!</CardTitle>
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Redirecting to booking details...</p>
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (hasAgreement && signedAgreement) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="CUSTOMER" />
        <PageContent>
          <Card>
            <div className="flex flex-col items-center gap-4 py-12">
              <FileSignature className="h-16 w-16 text-charcoal-300 dark:text-charcoal-600" />
              <h1 className="font-display text-2xl font-semibold">Your signed agreement</h1>
              <p className="text-sm text-charcoal-600 dark:text-charcoal-300">
                Signed by {signedAgreement.customerName} on {new Date(signedAgreement.signedAt).toLocaleDateString("en-GB", { dateStyle: "long" })}.
              </p>
              <p className="font-semibold">Agreed total: {formatCurrency(signedAgreement.totalAmount, currency)}</p>
              {signedAgreement.depositAmount != null && <p>Agreed deposit: {formatCurrency(signedAgreement.depositAmount, currency)}</p>}
              <div className="w-full max-w-3xl rounded-lg bg-sand p-4 dark:bg-charcoal-800">
                <h2 className="font-semibold">Terms you signed</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-charcoal-700 dark:text-charcoal-200">{signedAgreement.terms}</p>
              </div>
              <Link href={`/dashboard/bookings/${bookingId}`}>
                <Button>View Booking</Button>
              </Link>
            </div>
          </Card>
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

        <h1 className="mb-6 font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Customer Agreement</h1>
        {!canSign && (
          <Card className="mb-6">
            <p role="status" className="text-sm leading-relaxed">
              This agreement is not ready to sign. The booking must be open and have a current quotation with terms, a matching total and a valid deposit. Ask your provider to update it, then reload this page.
            </p>
          </Card>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle className="mb-1">Event</CardTitle>
            <p className="text-sm font-medium">{booking.event.title}</p>
            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{booking.provider.businessName}</p>
          </Card>
          <Card>
            <CardTitle className="mb-1">Total Amount</CardTitle>
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(totalAmount, currency)}</p>
            {depositAmount > 0 && (
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Deposit: {formatCurrency(depositAmount, currency)}</p>
            )}
          </Card>
        </div>

        {quoteDoc && parseLineItems(quoteDoc.lineItems).length > 0 && (
          <Card className="mb-6">
            <CardTitle className="mb-3">Quote Details · {quoteDoc.documentNumber}</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="border-b border-charcoal-200 dark:border-charcoal-800 text-left">
                    <th className="pb-2 font-medium text-charcoal-500 dark:text-charcoal-400">Description</th>
                    <th className="pb-2 font-medium text-charcoal-500 dark:text-charcoal-400">Qty</th>
                    <th className="pb-2 font-medium text-charcoal-500 dark:text-charcoal-400">Unit Price</th>
                    <th className="pb-2 text-right font-medium text-charcoal-500 dark:text-charcoal-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parseLineItems(quoteDoc.lineItems).map((li, i) => (
                    <tr key={i} className="border-b border-charcoal-100 dark:border-charcoal-800">
                      <td className="py-2">{li.description}</td>
                      <td className="py-2">{li.quantity}</td>
                      <td className="py-2">{formatCurrency(li.unitPrice, currency)}</td>
                      <td className="py-2 text-right">{formatCurrency(li.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardTitle className="mb-4">Your Information</CardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Full Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                placeholder="+1234567890"
              />
              <Input
                label="Email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
              <Input
                label="Address (optional)"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
          </Card>

          <Card className="mb-6">
            <CardTitle className="mb-4">Terms & Conditions</CardTitle>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-charcoal-200 dark:border-charcoal-800 bg-sand dark:bg-charcoal-800 p-4 text-sm text-charcoal-600 dark:text-charcoal-300">
              {(termsText || "No quotation terms have been supplied yet.").split("\n").map((line, i) => (
                <p key={i} className="mb-1">{line}</p>
              ))}
            </div>
          </Card>

          <Card className="mb-6">
            <CardTitle className="mb-4">Signature</CardTitle>
            <p className="mb-3 text-sm text-charcoal-500 dark:text-charcoal-400">
              Type your full name below to sign this agreement electronically. By typing your name, you agree to the terms above.
            </p>
            <Input
              label="Type your full name to sign"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="John Doe"
              required
            />
          </Card>

          {error && (
            <Card className="mb-6 border-terracotta-200 dark:border-terracotta-800 bg-terracotta-50 dark:bg-terracotta-900/30">
              <p className="text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>
            </Card>
          )}

          <Button
            type="submit"
            disabled={!canSign || submitting || !signature.trim() || !customerName.trim() || !customerPhone.trim() || !customerEmail.trim()}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting...</>
            ) : (
              <><FileSignature className="mr-2 h-5 w-5" /> Accept & Sign</>
            )}
          </Button>
        </form>
      </PageContent>
    </div>
  );
}
