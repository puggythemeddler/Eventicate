import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";
import { SERVICE_CATEGORIES, getEventHeroClass } from "@/lib/constants";
import { Search, Calendar, Star, Shield, ArrowRight } from "lucide-react";
import { FadeUp, FadeIn, ScaleIn, StaggerGroup, StaggerItem } from "@/components/motion/animations";
import { CountUp } from "@/components/motion/CountUp";

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
      <section className={`${heroClass} gradient-shift relative overflow-hidden px-4 py-24 text-white`}>
        <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse-glow" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-primary-900/30 blur-3xl animate-float-slow" />
        <div className="relative mx-auto max-w-4xl text-center">
          <FadeIn>
            <span className="mb-6 inline-block rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              🎉 Event planning, simplified
            </span>
          </FadeIn>
          <FadeUp delay={0.1}>
            <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">{heroTitle}</h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mb-8 text-xl text-primary-100">{heroSubtitle}</p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/search"
                className="flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-semibold text-primary-700 transition-transform hover:scale-105 hover:bg-primary-50"
              >
                <Search className="h-5 w-5" />
                Find Services
              </Link>
              <Link
                href="/auth/register?role=provider"
                className="rounded-xl border-2 border-white px-8 py-3 font-semibold transition-transform hover:scale-105 hover:bg-white/10"
              >
                List Your Business
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <FadeUp>
            <h2 className="mb-8 text-center text-3xl font-bold">Browse by Category</h2>
          </FadeUp>
          <StaggerGroup className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {SERVICE_CATEGORIES.map((cat) => (
              <StaggerItem key={cat.value}>
                <Link
                  href={`/search?category=${cat.value}`}
                  className="card-hover flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900"
                >
                  <span className="mb-2 text-3xl transition-transform duration-300 hover:scale-125">
                    {cat.icon}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{cat.label}</span>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-4 py-16 dark:bg-gray-900/50">
        <div className="mx-auto max-w-7xl">
          <FadeUp>
            <h2 className="mb-12 text-center text-3xl font-bold">How Eventicate Works</h2>
          </FadeUp>
          <StaggerGroup className="grid gap-8 md:grid-cols-4">
            {[
              { step: "1", title: "Create Event", desc: "Set your event type, date, location, and budget", icon: Calendar },
              { step: "2", title: "Find Providers", desc: "Search and compare verified service providers", icon: Search },
              { step: "3", title: "Book & Pay", desc: "Request quotes, confirm bookings, and pay deposits", icon: Shield },
              { step: "4", title: "Enjoy & Review", desc: "Celebrate your event and rate your providers", icon: Star },
            ].map((item) => (
              <StaggerItem key={item.step}>
                <div className="text-center">
                  <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                    <item.icon className="h-6 w-6" />
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mb-2 font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <FadeUp>
                <h2 className="mb-4 text-3xl font-bold">Everything You Need</h2>
              </FadeUp>
              <FadeUp delay={0.1}>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  From weddings to corporate events, funerals to concerts — Eventicate connects
                  you with the right providers for every occasion.
                </p>
              </FadeUp>
              <StaggerGroup className="space-y-3">
                {[
                  "Dynamic pricing by event type",
                  "Real-time availability calendars",
                  "Internal messaging & quotations",
                  "Secure payments & deposits",
                  "Two-way rating system",
                  "Local system integration for providers",
                ].map((feature) => (
                  <StaggerItem key={feature}>
                    <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <ArrowRight className="h-4 w-4 text-primary-600" />
                      {feature}
                    </li>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
            <StaggerGroup className="grid grid-cols-2 gap-4">
              {[
                { label: "Event Types", value: "8+" },
                { label: "Service Categories", value: "9" },
                { label: "Provider Tools", value: "Full Suite" },
                { label: "Booking Workflow", value: "End-to-End" },
              ].map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="rounded-xl bg-primary-50 p-6 text-center dark:bg-primary-900/30">
                    <div className="text-3xl font-bold text-primary-700">
                      <CountUp value={stat.value} />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{stat.label}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`${heroClass} px-4 py-16 text-white`}>
        <div className="mx-auto max-w-2xl text-center">
          <ScaleIn>
            <h2 className="mb-4 text-3xl font-bold">
              {solemn ? "We're Here When You Need Us" : "Ready to Plan Your Event?"}
            </h2>
          </ScaleIn>
          <FadeUp delay={0.1}>
            <p className="mb-8 text-primary-100">
              Join Eventicate today and discover the easiest way to organize any event.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <Link
              href="/auth/register"
              className="inline-block rounded-xl bg-white px-8 py-3 font-semibold text-primary-700 transition-transform hover:scale-105 hover:bg-primary-50"
            >
              Create Free Account
            </Link>
          </FadeUp>
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