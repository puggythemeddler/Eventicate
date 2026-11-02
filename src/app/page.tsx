import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { PlanningForm } from "@/components/home/PlanningForm";
import { ListingCard } from "@/components/ui/ListingCard";
import { serverApi } from "@/lib/server-api";
import { isSolemnEvent } from "@/lib/constants";
import { ArrowRight, CalendarDays, Ticket } from "lucide-react";

const SERVICE_SPOTLIGHTS = [
  {
    href: "/search?category=VENUE",
    title: "Venues",
    description: "Spaces for a small gathering or a full guest list.",
    image: "https://res.cloudinary.com/u1ucoiox/image/upload/c_fill,w_1000,h_720,q_auto,f_auto/v1786893154/eventicate/Grand-Hall-Events/venues/garden-pavilion.jpg",
  },
  {
    href: "/search?category=CATERING",
    title: "Food & catering",
    description: "Browse menus, buffet options and meal packages.",
    image: "https://res.cloudinary.com/u1ucoiox/image/upload/c_fill,w_1000,h_720,q_auto,f_auto/v1786893155/eventicate/Delight-Catering-Co/catering/wedding-buffet.jpg",
  },
  {
    href: "/search?category=ENTERTAINMENT",
    title: "Music & entertainment",
    description: "Find DJs and sound for the kind of day you have in mind.",
    image: "https://res.cloudinary.com/u1ucoiox/image/upload/c_fill,w_1000,h_720,q_auto,f_auto/v1786893167/eventicate/SoundPro-PA-Systems/pa/dj-booth.jpg",
  },
  {
    href: "/search?category=TENTS",
    title: "Tents & rentals",
    description: "Explore marquees and practical event equipment.",
    image: "https://res.cloudinary.com/u1ucoiox/image/upload/c_fill,w_1000,h_720,q_auto,f_auto/v1793596684/eventicate/Tents-Africa/tents/marquee-garden-setup.jpg",
  },
];

const QUESTIONS = [
  {
    title: "Does the price include transport?",
    answer: "Ask the provider to include delivery, collection and setup in your quotation. A starting price on a listing may not cover these costs, especially if your event is outside their usual area.",
  },
  {
    title: "Can I hire just chairs or a tent?",
    answer: "You can browse equipment separately and add the items you need to your cart. Check quantities, hire duration and setup with the provider before confirming your booking.",
  },
  {
    title: "What if my date changes?",
    answer: "Contact your provider before changing plans. Ask about availability on the new date, any extra charges and what happens to your deposit. Check the cancellation terms in your agreement before signing.",
  },
  {
    title: "What does the verified badge mean?",
    answer: "The badge means an administrator has approved the provider’s submitted verification documents. It is a document review, so take time to look at their work, read available reviews and discuss what you need.",
  },
];

interface FeaturedProvider {
  id: string;
  businessName: string;
  description: string | null;
  category: string;
  city: string | null;
  country: string | null;
  averageRating: number;
  verificationStatus: string;
  images: string[];
  services: { name: string; basePrice: number }[];
  _count: { reviewsReceived: number };
}

const actionClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-6 py-3 font-medium text-charcoal-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500";

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ eventType?: string }>;
}) {
  const { eventType } = await searchParams;
  const solemn = isSolemnEvent(eventType);
  let featured: FeaturedProvider[] = [];
  let providersUnavailable = false;
  try {
    const data = await serverApi<{ providers: FeaturedProvider[] }>("/api/providers?limit=6");
    featured = data.providers;
  } catch {
    providersUnavailable = true;
  }

  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main>
        <section className="bg-charcoal-950 px-4 py-12 text-cream md:py-16" aria-labelledby="home-heading">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-5xl">
              <h1 id="home-heading" className="max-w-5xl font-display text-4xl font-semibold leading-tight tracking-[-0.025em] md:text-5xl lg:text-6xl">
                {solemn ? "Find support for the gathering ahead." : "Plan an event. Find one to attend."}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-charcoal-100 md:text-lg">
                {solemn
                  ? "Find venues, catering and equipment for a respectful gathering. You can also browse public events across Kenya, Uganda and Tanzania."
                  : "Find local event services or browse public events and available tickets."}
              </p>
            </div>

            <div className="mt-7 grid gap-3 md:mt-9 md:grid-cols-2 md:gap-5">
              <article className="flex flex-col items-start rounded-xl bg-sand p-5 text-charcoal-900 md:p-8">
                <div className="flex items-center gap-3 md:block">
                  <CalendarDays className="h-5 w-5 shrink-0 text-primary-700 md:h-6 md:w-6" aria-hidden="true" />
                  <h2 className="font-display text-xl font-semibold md:mt-5 md:text-2xl">Plan an event</h2>
                </div>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-charcoal-700 md:text-base">
                  Compare providers, ask for quotes and keep bookings together.
                </p>
                <a href="#plan" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 font-medium text-charcoal-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 md:mt-6">
                  Start planning <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>

              <article className="flex flex-col items-start rounded-xl bg-charcoal-900 p-5 md:p-8">
                <div className="flex items-center gap-3 md:block">
                  <Ticket className="h-5 w-5 shrink-0 text-gold-300 md:h-6 md:w-6" aria-hidden="true" />
                  <h2 className="font-display text-xl font-semibold md:mt-5 md:text-2xl">Find an event to attend</h2>
                </div>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-charcoal-100 md:text-base">
                  Browse public events and check which tickets are available.
                </p>
                <Link href="/tickets" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-gold-400 px-5 py-2.5 font-medium text-cream transition-colors hover:bg-charcoal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 md:mt-6">
                  Browse events <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section id="plan" aria-label="Find providers by service and location" className="scroll-mt-20 px-4 pt-8">
          <div className="mx-auto max-w-7xl"><PlanningForm /></div>
        </section>

        <section className="px-4 py-14 md:py-20" aria-labelledby="providers-heading">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="providers-heading" className="font-display text-3xl font-semibold md:text-4xl">Meet the providers</h2>
                <p className="mt-3 max-w-xl text-charcoal-600 dark:text-charcoal-300">
                  See where they’re based, what they offer and what other customers have shared.
                </p>
              </div>
              <Link href="/search" className="inline-flex items-center gap-2 rounded-sm py-3 font-medium text-primary-700 hover:underline dark:text-primary-300">
                See all providers <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {featured.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((provider) => (
                  <ListingCard key={provider.id} provider={{ ...provider, totalReviews: provider._count.reviewsReceived }} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-sand p-6 dark:bg-charcoal-900">
                <p className="font-medium">{providersUnavailable ? "We couldn’t load the providers just now." : "No providers to show yet."}</p>
                <p className="mt-2 text-charcoal-600 dark:text-charcoal-300">
                  {providersUnavailable ? "Try browsing again in a moment." : "You can still explore the service categories below."}
                </p>
                <Link href="/search" className="mt-4 inline-block py-2 font-medium underline underline-offset-4">Browse providers</Link>
              </div>
            )}
          </div>
        </section>

        <section className="bg-sand px-4 py-14 dark:bg-charcoal-900 md:py-20" aria-labelledby="categories-heading">
          <div className="mx-auto max-w-7xl">
            <h2 id="categories-heading" className="font-display text-3xl font-semibold md:text-4xl">Still making your list?</h2>
            <p className="mt-3 text-charcoal-600 dark:text-charcoal-300">Browse the services people use to bring a gathering together.</p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICE_SPOTLIGHTS.map((item) => (
                <Link key={item.title} href={item.href} className="group overflow-hidden rounded-xl bg-cream text-charcoal-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 dark:bg-charcoal-950 dark:text-cream">
                  <div className="aspect-[5/3] overflow-hidden bg-charcoal-100 dark:bg-charcoal-800">
                    {/* Cloudinary demo portfolio imagery illustrates each service category. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="before-you-book" className="scroll-mt-20 px-4 py-14 md:py-20" aria-labelledby="questions-heading">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <div>
              <h2 id="questions-heading" className="max-w-sm font-display text-3xl font-semibold md:text-4xl">Before you book</h2>
              <p className="mt-4 max-w-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">
                The details matter: transport, setup, dates and deposits. Get them agreed with your provider before you commit.
              </p>
              <Link href="/how-it-works" className="mt-6 inline-flex items-center gap-2 py-3 font-medium text-primary-700 hover:underline dark:text-primary-300">
                Read the booking guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="space-y-8">
              {QUESTIONS.map((question) => (
                <div key={question.title}>
                  <h3 className="text-lg font-semibold">{question.title}</h3>
                  <p className="mt-2 leading-relaxed text-charcoal-600 dark:text-charcoal-300">{question.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-charcoal-950 px-4 py-14 text-cream md:py-20" aria-labelledby="business-heading">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 id="business-heading" className="font-display text-3xl font-semibold md:text-4xl">Do you run an event business?</h2>
              <p className="mt-4 leading-relaxed text-charcoal-200">
                Show customers your work, list your services and prices, and handle enquiries and quotations from your provider account.
              </p>
            </div>
            <Link href="/auth/register?role=provider" className={actionClass}>
              List your business <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
