import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { PlanningForm } from "@/components/home/PlanningForm";
import { ListingCard } from "@/components/ui/ListingCard";
import { serverApi } from "@/lib/server-api";
import { isSolemnEvent } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
  { href: "/search?category=VENUE", title: "Venues", description: "Find a space for your guest list." },
  { href: "/search?category=CATERING", title: "Catering", description: "Compare menus and meal packages." },
  { href: "/search?category=TENTS", title: "Tents & rentals", description: "Hire tents, chairs and tables." },
  { href: "/search?category=ENTERTAINMENT", title: "Entertainment", description: "Find DJs, bands and MCs." },
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
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <section className="relative bg-charcoal-950 text-cream">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
            <div className="max-w-2xl">
              <h1 className="max-w-xl font-display text-4xl font-semibold leading-tight md:text-6xl">
                {solemn ? "Support for your gathering." : "Find your event people."}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream">
                {solemn
                  ? "Find venues, catering and equipment hire for a respectful gathering in Kenya, Uganda or Tanzania."
                  : "Find venues, caterers, photographers and equipment hire across Kenya, Uganda and Tanzania."}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <a href="#plan" className={actionClass}>
                  Find a provider <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <Link href="/how-it-works" className="rounded-sm py-3 font-medium underline decoration-cream/50 underline-offset-4 hover:decoration-cream focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500">
                  How booking works
                </Link>
              </div>
              <p className="mt-8 text-sm leading-relaxed text-charcoal-100">
                {solemn ? "Start with your location and what you need." : "A wedding, a family gathering, a work event. Start with what you need."}
              </p>
            </div>
            <aside className="hidden rounded-xl bg-charcoal-900 p-8 lg:block" aria-labelledby="enquiry-heading">
              <h2 id="enquiry-heading" className="font-display text-2xl font-semibold">A useful first enquiry</h2>
              <p className="mt-3 leading-relaxed text-charcoal-200">Help a provider put together a quotation that fits. Share:</p>
              <ul className="mt-5 list-disc space-y-3 pl-5 text-charcoal-100 marker:text-gold-400">
                <li>Your date and event location</li>
                <li>How many guests you expect</li>
                <li>The services or equipment you need</li>
                <li>Whether you need delivery and setup</li>
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-charcoal-200">Still working out the details? Browse first to see what’s available.</p>
            </aside>
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
            <p className="mt-3 text-charcoal-600 dark:text-charcoal-300">Start with the space, the food or the things you need to hire.</p>
            <div className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((category) => (
                <Link key={category.title} href={category.href} className="group rounded-lg py-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500">
                  <h3 className="flex items-center justify-between gap-3 font-display text-xl font-semibold">
                    {category.title}<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
                  </h3>
                  <p className="mt-2 text-sm text-charcoal-600 dark:text-charcoal-300">{category.description}</p>
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
