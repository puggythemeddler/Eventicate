import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, formatDate, formatDateTime, getCurrencyForCountry } from "@/lib/utils";
import { ArrowLeft, Calendar, DollarSign, MessageSquare, Mail, User } from "lucide-react";
import { DocumentActions, ProviderBookingActions, ProviderNotesForm } from "./ProviderBookingActions";
import { settledPaymentTotal } from "@/lib/payment-balance";
import { CancellationStatus, type CancellationDecision } from "@/components/bookings/CancellationStatus";

type BookingDetail = {
  id: string;
  status: string;
  quotedPrice: number | null;
  finalPrice: number | null;
  depositAmount: number | null;
  customerNotes: string | null;
  providerNotes: string | null;
  cancellationRequests?: CancellationDecision[];
  event: { title: string; eventDate: string; guestCount: number };
  customer: {
    user: { firstName: string; lastName: string; email: string; phone: string | null };
  };
  service: { name: string } | null;
  payments: {
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }[];
  messages: {
    id: string;
    content: string;
    createdAt: string;
    sender: { firstName: string; lastName: string; role: string };
  }[];
};

export default async function ProviderBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  const { id } = await params;

  let booking: BookingDetail | undefined;
  try {
    const data = await serverApi<{ booking: BookingDetail }>(`/api/bookings/${id}`);
    booking = data.booking;
  } catch {
    notFound();
  }

if (!booking) notFound();

  const currency = getCurrencyForCountry(session.country);
  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <Link
          href="/provider/bookings"
          className="mb-4 flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookings
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">{booking.event.title}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              {booking.customer.user.firstName} {booking.customer.user.lastName}
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Customer</p>
                <p className="text-sm font-medium">
                  {booking.customer.user.firstName} {booking.customer.user.lastName}
                </p>
                <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{booking.customer.user.email}</p>
                {booking.customer.user.phone && (
                  <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{booking.customer.user.phone}</p>
                )}
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Event</p>
                <p className="text-sm font-medium">{booking.event.title}</p>
                <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{formatDate(new Date(booking.event.eventDate))}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Service</p>
                <p className="text-sm font-medium">{booking.service?.name || "General"}</p>
                <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{booking.event.guestCount} guests</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Contact</p>
                <p className="text-sm font-medium">{booking.customer.user.email}</p>
                {booking.customer.user.phone && (
                  <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{booking.customer.user.phone}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardTitle className="mb-1">Quoted Price</CardTitle>
            <p className="text-2xl font-bold text-primary-600">
              {booking.quotedPrice ? formatCurrency(booking.quotedPrice, currency) : "—"}
            </p>
          </Card>
          <Card>
            <CardTitle className="mb-1">Final Price</CardTitle>
            <p className="text-2xl font-bold">
              {booking.finalPrice ? formatCurrency(booking.finalPrice, currency) : "—"}
            </p>
          </Card>
          <Card>
            <CardTitle className="mb-1">Deposit</CardTitle>
            <p className="text-2xl font-bold">
              {booking.depositAmount ? formatCurrency(booking.depositAmount, currency) : "—"}
            </p>
          </Card>
        </div>

        {booking.customerNotes && (
          <Card className="mb-8">
            <CardTitle className="mb-2">Customer Notes</CardTitle>
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{booking.customerNotes}</p>
          </Card>
        )}

        <Card className="mb-8">
          <ProviderNotesForm bookingId={booking.id} providerNotes={booking.providerNotes} />
        </Card>

        <div className="mb-8">
          <ProviderBookingActions bookingId={booking.id} status={booking.status} hasPayments={settledPaymentTotal(booking.payments) > 0} />
          <CancellationStatus requests={booking.cancellationRequests} currency={currency} />
        </div>

        <Card className="mb-8">
          <CardTitle className="mb-4">Documents</CardTitle>
          <DocumentActions bookingId={booking.id} />
        </Card>

        <div className="mb-8 grid gap-8 lg:grid-cols-2">
          <Card>
            <CardTitle className="mb-4">Payments</CardTitle>
            {booking.payments.length === 0 ? (
              <CardDescription>No payments recorded.</CardDescription>
            ) : (
              <div className="space-y-3">
                {booking.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border border-charcoal-100 dark:border-charcoal-800 p-3"
                  >
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount, currency)}</p>
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                        {payment.method.replace(/_/g, " ")} · {formatDateTime(new Date(payment.createdAt))}
                      </p>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-4">Messages from Customer</CardTitle>
            {booking.messages.length === 0 ? (
              <CardDescription>No messages yet.</CardDescription>
            ) : (
              <div className="space-y-3">
                {booking.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border border-charcoal-100 dark:border-charcoal-800 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {msg.sender.firstName} {msg.sender.lastName}
                      </span>
                      <span className="text-xs text-charcoal-400 dark:text-charcoal-500">
                        {formatDateTime(new Date(msg.createdAt))}
                      </span>
                    </div>
                    <p className="text-sm text-charcoal-600 dark:text-charcoal-300">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
            <Link href={`/provider/messages?bookingId=${booking.id}`}>
              <Button variant="outline" className="mt-4 w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </Link>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}
