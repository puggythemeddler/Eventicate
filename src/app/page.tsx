import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";
import { SERVICE_CATEGORIES, getEventHeroClass } from "@/lib/constants";
import { Search, Calendar, Star, Shield, ArrowRight } from "lucide-react";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ eventType?: string }>;
}) {
  const { eventType } = await searchParams;
  const solemn = eventType === "FUNERAL" || eventType === "CHURCH";
  const heroClass = getEventHeroClass(eventType);
  const heroTitle = solemn ? "Plan with Care" : "Plan Your Perfect Event";
  const heroSubtitle = solemn
    ? "Quiet, respectful support from verified providers for your occasion."
    : "Find, compare, and book venues, catering, PA systems, photography, transport, and more — all from one platform.";

  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero */}
      <section className={`${heroClass} px-4 py-24 text-white`}>
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
            {heroTitle}
          </h1>
          <p className="mb-8 text-xl text-primary-100">
            {heroSubtitle}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/search"
              className="flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-semibold text-primary-700 hover:bg-primary-50"
            >
              <Search className="h-5 w-5" />
              Find Services
            </Link>
            <Link
              href="/auth/register?role=provider"
              className="rounded-xl border-2 border-white px-8 py-3 font-semibold hover:bg-white/10"
            >
              List Your Business
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-8 text-center text-3xl font-bold">Browse by Category</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {SERVICE_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/search?category=${cat.value}`}
                className="card-hover flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900"
              >
                <span className="mb-2 text-3xl">{cat.icon}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-4 py-16 dark:bg-gray-900/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-3xl font-bold">How Eventicate Works</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "1", title: "Create Event", desc: "Set your event type, date, location, and budget", icon: Calendar },
              { step: "2", title: "Find Providers", desc: "Search and compare verified service providers", icon: Search },
              { step: "3", title: "Book & Pay", desc: "Request quotes, confirm bookings, and pay deposits", icon: Shield },
              { step: "4", title: "Enjoy & Review", desc: "Celebrate your event and rate your providers", icon: Star },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold">Everything You Need</h2>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                From weddings to corporate events, funerals to concerts — Eventicate connects
                you with the right providers for every occasion.
              </p>
              <ul className="space-y-3">
                {[
                  "Dynamic pricing by event type",
                  "Real-time availability calendars",
                  "Internal messaging & quotations",
                  "Secure payments & deposits",
                  "Two-way rating system",
                  "Local system integration for providers",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <ArrowRight className="h-4 w-4 text-primary-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Event Types", value: "8+" },
                { label: "Service Categories", value: "9" },
                { label: "Provider Tools", value: "Full Suite" },
                { label: "Booking Workflow", value: "End-to-End" },
              ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-primary-50 p-6 text-center dark:bg-primary-900/30">
                  <div className="text-3xl font-bold text-primary-700">{stat.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`${heroClass} px-4 py-16 text-white`}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">
            {solemn ? "We're Here When You Need Us" : "Ready to Plan Your Event?"}
          </h2>
          <p className="mb-8 text-primary-100">
            Join Eventicate today and discover the easiest way to organize any event.
          </p>
          <Link
            href="/auth/register"
            className="inline-block rounded-xl bg-white px-8 py-3 font-semibold text-primary-700 hover:bg-primary-50"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white px-4 py-8 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl text-center text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Eventicate. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
