"use client";

import { useRef, useState } from "react";
import { TicketQr } from "@/components/tickets/TicketQr";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { Check, Printer } from "lucide-react";

interface TicketOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  remaining: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
}

interface TicketOrderResult {
  orderCode: string;
  status: string;
  tickets: { ticketCode: string; status: string; qrToken: string }[];
}

export function TicketOrderForm({
  slug,
  title,
  currency,
  ticketTypes,
}: {
  slug: string;
  title: string;
  currency: string;
  ticketTypes: TicketOption[];
}) {
  const freeTypes = ticketTypes.filter((type) => type.price === 0 && type.remaining > 0);
  const [ticketTypeId, setTicketTypeId] = useState(freeTypes[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<TicketOrderResult | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const selected = ticketTypes.find((type) => type.id === ticketTypeId);

  const reserve = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || selected.price > 0) return;
    setSubmitting(true);
    setError("");
    idempotencyKey.current ||= crypto.randomUUID();
    try {
      const response = await fetch(`/api/ticketing/events/${encodeURIComponent(slug)}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketTypeId,
          quantity,
          buyerName,
          buyerEmail,
          buyerPhone,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not reserve tickets");
      setOrder(result.order as TicketOrderResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reserve tickets. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (order) {
    return (
      <section className="border border-charcoal-300 bg-white p-5 dark:border-charcoal-700 dark:bg-charcoal-900 print:border-black" aria-labelledby="reservation-confirmed">
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-charcoal-300 pb-4 dark:border-charcoal-700 print:border-black">
          <div>
            <p className="text-xs font-medium text-olive-700 dark:text-olive-300">Reservation confirmed</p>
            <h2 id="reservation-confirmed" className="mt-1 font-display text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-charcoal-600 dark:text-charcoal-300">Order {order.orderCode}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />Print tickets
          </Button>
        </div>
        <p className="my-4 text-sm text-charcoal-700 dark:text-charcoal-200">Show each QR code at the entrance. Keep this page open or print it before leaving.</p>
        <div className="divide-y divide-charcoal-200 dark:divide-charcoal-800">
          {order.tickets.map((ticket, index) => (
            <div key={ticket.ticketCode} className="flex flex-wrap items-center justify-between gap-4 py-4 print:break-inside-avoid">
              <div>
                <p className="font-medium">{selected?.name || "Admission"} · Ticket {index + 1}</p>
                <p className="mt-1 break-all font-mono text-xs text-charcoal-600 dark:text-charcoal-300">{ticket.ticketCode}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-olive-700 dark:text-olive-300"><Check className="h-3.5 w-3.5" aria-hidden="true" />Free ticket · {formatCurrency(0, currency)}</p>
              </div>
              <TicketQr token={ticket.qrToken} label={`${title}, ticket ${index + 1}`} />
            </div>
          ))}
        </div>
        <p className="mt-3 border-t border-dashed border-charcoal-300 pt-4 text-xs text-charcoal-600 dark:border-charcoal-700 dark:text-charcoal-300 print:border-black">
          A copy is shown here. Save or print this page so you can present your tickets at the gate.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={reserve} className="border border-charcoal-300 bg-white p-5 dark:border-charcoal-700 dark:bg-charcoal-900">
      <div className="flex items-baseline justify-between gap-3 border-b border-charcoal-200 pb-4 dark:border-charcoal-800">
        <div>
          <p className="text-xs font-medium text-charcoal-500 dark:text-charcoal-400">Tickets</p>
          <h2 className="mt-1 font-display text-xl font-semibold">Reserve your place</h2>
        </div>
        <p className="text-sm text-charcoal-600 dark:text-charcoal-300">Free tickets are available</p>
      </div>

      {ticketTypes.length > 0 && (
        <fieldset className="mt-4 space-y-3">
          <legend className="mb-2 text-sm font-medium">Choose a ticket</legend>
          {ticketTypes.map((type) => {
            const free = type.price === 0;
            const available = type.remaining > 0;
            const enabled = free && available;
            return (
              <label key={type.id} className={`flex cursor-pointer items-start gap-3 border p-3 ${ticketTypeId === type.id ? "border-charcoal-900 dark:border-charcoal-100" : "border-charcoal-200 dark:border-charcoal-800"} ${!enabled ? "cursor-not-allowed opacity-60" : ""}`}>
                <input type="radio" name="ticketType" value={type.id} checked={ticketTypeId === type.id} disabled={!enabled} onChange={() => setTicketTypeId(type.id)} className="mt-1 accent-charcoal-900" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2 font-medium"><span>{type.name}</span><span>{type.price === 0 ? "Free" : formatCurrency(type.price, currency)}</span></span>
                  {type.description && <span className="mt-1 block text-sm text-charcoal-600 dark:text-charcoal-300">{type.description}</span>}
                  <span className="mt-1 block text-xs text-charcoal-500 dark:text-charcoal-400">
                    {!available ? "Sold out" : free ? `${type.remaining} available` : "Paid checkout is waiting for payment setup"}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {freeTypes.length === 0 && <p className="mt-4 text-sm text-charcoal-600 dark:text-charcoal-300">There are no free tickets available to reserve online yet. Paid checkout is not active until M-Pesa setup and the ticket payment flow are connected and verified.</p>}

      {selected?.price === 0 && selected.remaining > 0 && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">Your name
              <input required maxLength={120} autoComplete="name" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className="min-h-11 w-full rounded-lg border border-charcoal-300 bg-white px-3 text-sm font-normal dark:border-charcoal-700 dark:bg-charcoal-950" />
            </label>
            <label className="space-y-1 text-sm font-medium">Email for your reservation
              <input required type="email" maxLength={254} autoComplete="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} className="min-h-11 w-full rounded-lg border border-charcoal-300 bg-white px-3 text-sm font-normal dark:border-charcoal-700 dark:bg-charcoal-950" />
            </label>
            <label className="space-y-1 text-sm font-medium sm:col-span-2">Phone <span className="font-normal text-charcoal-500">(optional)</span>
              <input type="tel" maxLength={30} autoComplete="tel" value={buyerPhone} onChange={(event) => setBuyerPhone(event.target.value)} className="min-h-11 w-full rounded-lg border border-charcoal-300 bg-white px-3 text-sm font-normal dark:border-charcoal-700 dark:bg-charcoal-950" />
            </label>
          </div>
          <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
            <span>Number of tickets</span>
            <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="min-h-11 rounded-lg border border-charcoal-300 bg-white px-3 dark:border-charcoal-700 dark:bg-charcoal-950">
              {Array.from({ length: Math.min(10, selected.remaining) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
            </select>
          </label>
          <p className="mt-4 text-xs leading-relaxed text-charcoal-500 dark:text-charcoal-400">Your name and email are used to create this ticket reservation and will be visible to the event organizer.</p>
          {error && <p role="alert" className="mt-4 text-sm text-terracotta-700 dark:text-terracotta-300">{error}</p>}
          <Button type="submit" className="mt-5 w-full" disabled={submitting || !ticketTypeId}>
            {submitting ? "Reserving…" : `Reserve ${quantity} ${quantity === 1 ? "ticket" : "tickets"}`}
          </Button>
        </>
      )}
    </form>
  );
}
