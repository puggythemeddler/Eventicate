"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi", "Democratic Republic of the Congo", "South Sudan", "Somalia"];
const TIMEZONES = ["Africa/Nairobi", "Africa/Kampala", "Africa/Dar_es_Salaam", "Africa/Kigali", "Africa/Bujumbura", "Africa/Lubumbashi", "Africa/Juba", "Africa/Mogadishu"];
const COUNTRY_TIMEZONE: Record<string, string> = {
  Kenya: "Africa/Nairobi", Uganda: "Africa/Kampala", Tanzania: "Africa/Dar_es_Salaam", Rwanda: "Africa/Kigali",
  Burundi: "Africa/Bujumbura", "Democratic Republic of the Congo": "Africa/Lubumbashi", "South Sudan": "Africa/Juba", Somalia: "Africa/Mogadishu",
};
const COUNTRY_CURRENCY: Record<string, string> = {
  Kenya: "KES", Uganda: "UGX", Tanzania: "TZS", Rwanda: "RWF", Burundi: "BIF",
  "Democratic Republic of the Congo": "CDF", "South Sudan": "SSP", Somalia: "SOS",
};

interface TicketDraft {
  name: string;
  description: string;
  price: string;
  quantity: string;
}

function localEventTimeToIso(value: string, timeZone: string): string | undefined {
  if (!value) return undefined;
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  let candidate = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    candidate += target - represented;
  }
  return new Date(candidate).toISOString();
}

export function NewTicketEventForm({ defaultCountry = "Kenya", commissionRate = 0.06 }: { defaultCountry?: string; commissionRate?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState(COUNTRIES.includes(defaultCountry) ? defaultCountry : "Kenya");
  const [ticketTypes, setTicketTypes] = useState<TicketDraft[]>([{ name: "General Admission", description: "", price: "0", quantity: "100" }]);
  const [publishNow, setPublishNow] = useState(true);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Concert & music");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const initialCountry = COUNTRIES.includes(defaultCountry) ? defaultCountry : "Kenya";
  const [timeZone, setTimeZone] = useState(COUNTRY_TIMEZONE[initialCountry]);
  const [venueName, setVenueName] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState(COUNTRY_CURRENCY[COUNTRIES.includes(defaultCountry) ? defaultCountry : "Kenya"]);
  const [imageUrl, setImageUrl] = useState("");
  const [feePayer, setFeePayer] = useState("ORGANIZER");

  const updateTicket = (index: number, key: keyof TicketDraft, value: string) => {
    setTicketTypes((current) => current.map((ticket, row) => row === index ? { ...ticket, [key]: value } : ticket));
  };

  const submit = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ticketing/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, summary, description, category,
          startsAt: localEventTimeToIso(startsAt, timeZone), endsAt: localEventTimeToIso(endsAt, timeZone), timeZone,
          venueName, location, city, country, currency, imageUrl,
          status: publishNow ? "PUBLISHED" : "DRAFT",
          feePayer,
          ticketTypes: ticketTypes.map((ticket) => ({ ...ticket, price: Number(ticket.price), quantity: Number(ticket.quantity) })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Check the event details and try again");
      router.push(`/organizer/tickets/${result.event.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish this event");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-10">
      <div className="flex items-center justify-between gap-3 border-b border-charcoal-200 pb-4 dark:border-charcoal-800">
        <Link href="/organizer/tickets" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-charcoal-700 hover:underline dark:text-charcoal-200"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to ticket events</Link>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} className="h-4 w-4 accent-charcoal-900" />Publish immediately</label>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 font-display text-xl font-semibold">Event details</legend>
        <Input label="Event name" required minLength={4} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Afrobeats by the Lake" />
        <Select label="Event type" value={category} onChange={(event) => setCategory(event.target.value)} options={["Concert & music", "Festival", "Community", "Arts & culture", "Sports", "Conference", "Food & drink", "Other"].map((value) => ({ value, label: value }))} />
        <div className="sm:col-span-2"><Input label="Short summary" required minLength={12} maxLength={240} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="A short description people can scan before opening the event." /></div>
        <div className="sm:col-span-2"><Textarea label="Event description" required minLength={20} maxLength={6000} rows={7} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will happen, who is it for, and what should attendees know before they arrive?" /></div>
        <Input label="Start date and time" type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
        <Input label="End date and time (optional)" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
        <Select label="Event time zone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} options={TIMEZONES.map((value) => ({ value, label: value.replace("Africa/", "").replaceAll("_", " ") }))} />
        <Input label="Venue name" required minLength={2} maxLength={120} value={venueName} onChange={(event) => setVenueName(event.target.value)} placeholder="Venue or gathering place" />
        <Input label="Street, area, or directions" required minLength={2} maxLength={180} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Estate, road, landmark, or directions" />
        <Input label="City or town" required minLength={2} maxLength={80} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Nairobi" />
        <Select label="Country" value={country} onChange={(event) => { setCountry(event.target.value); setCurrency(COUNTRY_CURRENCY[event.target.value] || "KES"); setTimeZone(COUNTRY_TIMEZONE[event.target.value] || "Africa/Nairobi"); }} options={COUNTRIES.map((value) => ({ value, label: value }))} />
        <Select label="Ticket currency" value={currency} onChange={(event) => setCurrency(event.target.value)} options={["KES", "UGX", "TZS", "RWF", "BIF", "CDF", "SSP", "SOS", "USD"].map((value) => ({ value, label: value }))} />
        <div className="sm:col-span-2"><Input label="Event image URL (optional)" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Paste an image URL from your event artwork" /></div>
      </fieldset>

      <fieldset>
        <legend className="font-display text-xl font-semibold">Ticket types</legend>
        <p className="mb-5 mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">Set a name, price and capacity for each ticket type. Free reservations work now. Paid tickets can be listed for planning, while paid checkout is connected and verified.</p>
        <div className="space-y-5">
          {ticketTypes.map((ticket, index) => (
            <div key={index} className="border-y border-charcoal-200 py-5 dark:border-charcoal-800">
              <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-medium">Ticket type {index + 1}</p>{ticketTypes.length > 1 && <button type="button" onClick={() => setTicketTypes((current) => current.filter((_, row) => row !== index))} aria-label={`Remove ticket type ${index + 1}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-charcoal-600 hover:text-terracotta-700 dark:text-charcoal-300"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove</button>}</div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="Ticket name" required minLength={2} maxLength={60} value={ticket.name} onChange={(event) => updateTicket(index, "name", event.target.value)} placeholder="General Admission" />
                <Input label={`Price (${currency})`} type="number" min="0" max="10000000" step="0.01" required value={ticket.price} onChange={(event) => updateTicket(index, "price", event.target.value)} />
                <Input label="Quantity available" type="number" min="1" max="100000" step="1" required value={ticket.quantity} onChange={(event) => updateTicket(index, "quantity", event.target.value)} />
              </div>
              <div className="mt-4"><Input label="What this ticket includes (optional)" maxLength={500} value={ticket.description} onChange={(event) => updateTicket(index, "description", event.target.value)} placeholder="Entry, seating section, or other inclusions" /></div>
            </div>
          ))}
        </div>
        {ticketTypes.length < 10 && <Button type="button" variant="outline" className="mt-3" onClick={() => setTicketTypes((current) => [...current, { name: "", description: "", price: "0", quantity: "50" }])}><Plus className="mr-2 h-4 w-4" />Add ticket type</Button>}
      </fieldset>

      <fieldset className="border-y border-charcoal-200 py-5 dark:border-charcoal-800">
        <legend className="font-display text-xl font-semibold">Ticket fee preference</legend>
        <p className="mb-4 mt-2 max-w-2xl text-sm text-charcoal-600 dark:text-charcoal-300">The current platform commission is {Number.isFinite(commissionRate) ? (commissionRate * 100).toLocaleString(undefined, { maximumFractionDigits: 2 }) : 6}%. There is no commission on free reservations. Payment-processing fees will be shown separately before paid checkout is enabled.</p>
        <Select label="Who covers the Eventickets commission on paid tickets?" value={feePayer} onChange={(event) => setFeePayer(event.target.value)} options={[{ value: "ORGANIZER", label: "I’ll cover it from my ticket revenue" }, { value: "ATTENDEE", label: "Add it to the buyer’s checkout total" }]} />
      </fieldset>

      <label className="flex items-start gap-3 text-sm leading-relaxed text-charcoal-700 dark:text-charcoal-200"><input required type="checkbox" className="mt-1 h-4 w-4 accent-charcoal-900" />I’m authorized to publish this event and have provided accurate event, venue, and ticket information.</label>
      {error && <p role="alert" className="text-sm text-terracotta-700 dark:text-terracotta-300">{error}</p>}
      <div className="flex flex-wrap items-center gap-4 border-t border-charcoal-200 pt-5 dark:border-charcoal-800">
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving event…" : publishNow ? "Publish event" : "Save draft"}</Button>
        <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Paid checkout needs M-Pesa setup plus a connected and verified ticket payment flow.</p>
      </div>
    </form>
  );
}
