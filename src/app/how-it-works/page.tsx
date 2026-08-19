import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-950">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-8 font-display text-4xl font-semibold text-charcoal-900 dark:text-charcoal-100">How Eventicate Works</h1>
        <div className="space-y-8">
          {[
            { n: 1, title: "Create Your Event", body: "Sign up, create an event with type, date, location, guest count, and budget. Select the services you need." },
            { n: 2, title: "Find & Compare Providers", body: "Browse verified providers by category. View profiles, pricing, equipment, packages, and availability calendars." },
            { n: 3, title: "Request & Confirm Bookings", body: "Send quotation requests, negotiate via in-app messaging, confirm bookings, and pay deposits securely." },
            { n: 4, title: "Enjoy Your Event", body: "Providers deliver on the booked date. After your event, rate your experience to help the community." },
          ].map((step) => (
            <div key={step.n} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white font-bold">
                {step.n}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{step.title}</h2>
                <p className="text-charcoal-600 dark:text-charcoal-300">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/auth/register" className="rounded-xl bg-primary-600 px-8 py-3 font-semibold text-white hover:bg-primary-700">
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}
