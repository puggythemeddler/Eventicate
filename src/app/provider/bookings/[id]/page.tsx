import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, formatDate, formatDateTime, getCurrencyForCountry } from "@/lib/utils";
import { ArrowLeft, Calendar, DollarSign, MessageSquare, Mail, User } from "lucide-react";

type BookingDetail = {
  id: string;
  status: string;
  quotedPrice: number | null;
  finalPrice: number | null;
  depositAmount: number | null;
  customerNotes: string | null;
  providerNotes: string | null;
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

function DocumentActions({ bookingId }: { bookingId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch(`/api/documents/generate?type=proforma&bookingId=${bookingId}`, { method: "POST" });
          if (res.ok) window.location.reload();
        }}
      >
        <Button type="submit" variant="outline" size="sm">Generate Proforma Invoice</Button>
      </form>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch(`/api/documents/generate?type=tax-invoice&bookingId=${bookingId}`, { method: "POST" });
          if (res.ok) window.location.reload();
        }}
      >
        <Button type="submit" variant="outline" size="sm">Generate Tax Invoice</Button>
      </form>
    </div>
  );
}

function ProviderBookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      {status === "QUOTATION_REQUESTED" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const formData = new FormData(form);
            const res = await fetch(`/api/bookings/${bookingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "QUOTATION_SENT",
                quotedPrice: Number(formData.get("quotedPrice")),
                providerNotes: formData.get("providerNotes") || undefined,
              }),
            });
            if (res.ok) window.location.reload();
          }}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <Input
            label="Quoted Price ($)"
            name="quotedPrice"
            type="number"
            step="0.01"
            min="0"
            required
            className="w-40"
          />
          <Textarea
            label="Provider Notes"
            name="providerNotes"
            rows={2}
            className="w-64"
            placeholder="Terms, details..."
          />
          <Button type="submit" variant="primary">Send Quotation</Button>
        </form>
      )}
      {status === "PENDING_APPROVAL" && (
        <>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const formData = new FormData(form);
              const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "CONFIRMED",
                  depositAmount: Number(formData.get("depositAmount")) || undefined,
                }),
              });
              if (res.ok) window.location.reload();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <Input
              label="Deposit Amount"
              name="depositAmount"
              type="number"
              step="0.01"
              min="0"
              className="w-40"
            />
            <Button type="submit" variant="primary">Confirm Booking</Button>
          </form>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "REJECTED" }),
              });
              if (res.ok) window.location.reload();
            }}
          >
            <Button type="submit" variant="danger">Reject</Button>
          </form>
        </>
      )}
      {status === "CONFIRMED" && (
        <>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "DEPOSIT_PAID" }),
              });
              if (res.ok) window.location.reload();
            }}
          >
            <Button type="submit" variant="primary">Mark Deposit Paid</Button>
          </form>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "COMPLETED" }),
              });
              if (res.ok) window.location.reload();
            }}
          >
            <Button type="submit" variant="secondary">Complete</Button>
          </form>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch(`/api/bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CANCELLED" }),
              });
              if (res.ok) window.location.reload();
            }}
          >
            <Button type="submit" variant="danger">Cancel</Button>
          </form>
        </>
      )}
      {status === "DEPOSIT_PAID" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch(`/api/bookings/${bookingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "COMPLETED" }),
            });
            if (res.ok) window.location.reload();
          }}
        >
          <Button type="submit" variant="primary">Complete Booking</Button>
        </form>
      )}
    </div>
  );
}

function ProviderNotesForm({ bookingId, providerNotes }: { bookingId: string; providerNotes: string | null }) {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);
        await fetch(`/api/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerNotes: formData.get("providerNotes") }),
        });
        window.location.reload();
      }}
      className="space-y-3"
    >
      <Textarea
        label="Provider Notes"
        name="providerNotes"
        defaultValue={providerNotes || ""}
        rows={3}
        placeholder="Internal notes about this booking..."
      />
      <Button type="submit" variant="outline" size="sm">Save Notes</Button>
    </form>
  );
}

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
              <h1 className="text-2xl font-bold">{booking.event.title}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-gray-500">
              {booking.customer.user.firstName} {booking.customer.user.lastName}
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="text-sm font-medium">
                  {booking.customer.user.firstName} {booking.customer.user.lastName}
                </p>
                <p className="text-xs text-gray-400">{booking.customer.user.email}</p>
                {booking.customer.user.phone && (
                  <p className="text-xs text-gray-400">{booking.customer.user.phone}</p>
                )}
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-gray-500">Event</p>
                <p className="text-sm font-medium">{booking.event.title}</p>
                <p className="text-xs text-gray-400">{formatDate(new Date(booking.event.eventDate))}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-gray-500">Service</p>
                <p className="text-sm font-medium">{booking.service?.name || "General"}</p>
                <p className="text-xs text-gray-400">{booking.event.guestCount} guests</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-gray-500">Contact</p>
                <p className="text-sm font-medium">{booking.customer.user.email}</p>
                {booking.customer.user.phone && (
                  <p className="text-xs text-gray-400">{booking.customer.user.phone}</p>
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
            <p className="text-sm text-gray-600">{booking.customerNotes}</p>
          </Card>
        )}

        <Card className="mb-8">
          <ProviderNotesForm bookingId={booking.id} providerNotes={booking.providerNotes} />
        </Card>

        <div className="mb-8">
          <ProviderBookingActions bookingId={booking.id} status={booking.status} />
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
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount, currency)}</p>
                      <p className="text-xs text-gray-500">
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
                    className="rounded-lg border border-gray-100 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {msg.sender.firstName} {msg.sender.lastName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(new Date(msg.createdAt))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{msg.content}</p>
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
