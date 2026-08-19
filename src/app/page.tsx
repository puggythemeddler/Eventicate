import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { PlanningForm } from "@/components/home/PlanningForm";
import { ListingCard } from "@/components/ui/ListingCard";
import { Button } from "@/components/ui/Button";
import { serverApi } from "@/lib/server-api";
import { isSolemnEvent } from "@/lib/constants";
import { ArrowRight, ShieldCheck, Banknote, Star, BadgeCheck, Lock } from "lucide-react";

const HERO_IMAGE = "https://images.unsplash.com/photo-1519741497674-611481863552?w=2000&q=80&auto=format&fit=crop";
const SOLEMN_HERO_IMAGE = "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=2000&q=80&auto=format&fit=crop";

const CATEGORY_TILES = [
  {
    href: "/search?category=VENUE",
    title: "Venues",
    description: "Spaces for every occasion — ballrooms, gardens and halls.",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80&auto=format&fit=crop",
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    href: "/search?category=CATERING",
    title: "Catering",
    description: "Menus, chefs and packages your guests will remember.",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80&auto=format&fit=crop",
    span: "",
  },
  {
    href: "/search?category=TENTS",
    title: "Rentals",
    description: "Tents, chairs, tables and staging for any setup.",
    image: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80&auto=format&fit=crop",
    span: "",
  },
  {
    href: "/search?category=ENTERTAINMENT",
    title: "Entertainment",
    description: "DJs, bands, MCs and live performers.",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80&auto=format&fit=crop",
    span: "lg:col-span-2",
  },
];

const STEPS = [
  { step: "01", title: "Create your event", description: "Set the type, date, guest count and budget." },
  { step: "02", title: "Discover providers", description: "Browse and compare verified venues, services and rentals." },
  { step: "03", title: "Add services & rentals", description: "Build up everything your event needs in one cart." },
  { step: "04", title: "Request quotations", description: "Send quote requests and compare pricing side by side." },
  { step: "05", title: "Book & pay", description: "Confirm bookings and pay deposits securely." },
  { step: "06", title: "Manage your event", description: "Track bookings, documents, messages and budget in one place." },
];

const TRUST_POINTS = [
  { icon: BadgeCheck, title: "Verified providers", description: "Businesses go through a verification review before they can operate." },
  { icon: Lock, title: "Secure payments", description: "Bookings and deposits are handled with clear, transparent terms." },
  { icon: Star, title: "Real customer reviews", description: "Two-way ratings after every event keep quality honest." },
  { icon: Banknote, title: "Transparent pricing", description: "See starting prices before you enquire — no guessing games." },
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ eventType?: string }>;
}) {
  const { eventType } = await searchParams;
  const solemn = isSolemnEvent(eventType);
  const heroImage = solemn ? SOLEMN_HERO_IMAGE : HERO_IMAGE;
  const heroSubtitle = solemn
    ? "Quiet, respectful support from verified providers for your occasion."
    : "Discover venues, services, equipment and professionals — all in one place.";

  let featured: FeaturedProvider[] = [];
  try {
    const data = await serverApi<{ providers: FeaturedProvider[] }>("/api/providers?limit=6");
    featured = data.providers;
  } catch {
    featured = [];
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero — real-event photography */}
      <section className="relative">
        <div className="relative h-[560px] w-full md:h-[640px]">
          <Image
            src={heroImage}
            alt="An elegant event reception"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="hero-image-overlay absolute inset-0" />
        </div>
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-4 pb-20">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10 bg-gold-400" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                  Event marketplace & planning platform
                </p>
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight text-cream md:text-5xl">
                Everything you need to bring your event together.
              </h1>
              <p className="mt-4 max-w-xl text-lg text-charcoal-100">{heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#plan">
                  <Button variant="gold" size="lg">
                    Start Planning
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Link href="/search">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-cream/40 bg-transparent text-cream hover:bg-cream/10"
                  >
                    Explore Marketplace
                  </Button>
                </Link>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-charcoal-200">
                <ShieldCheck className="h-4 w-4 text-gold-400" />
                Verified providers · Secure payments · Local professionals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Event planning search */}
      <section id="plan" className="relative -mt-8 scroll-mt-20 px-4">
        <div className="mx-auto max-w-7xl">
          <PlanningForm />
        </div>
      </section>

      {/* Explore categories */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
                Explore Eventicate
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal-900 dark:text-charcoal-100 md:text-4xl">
                What are you planning?
              </h2>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-400"
            >
              Browse everything <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_TILES.map((tile) => (
              <Link
                key={tile.title}
                href={tile.href}
                className={`group relative overflow-hidden rounded-xl bg-charcoal-900 ${tile.span}`}
              >
                <Image
                  src={tile.image}
                  alt={tile.title}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover opacity-90 transition-transform duration-300 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/85 via-charcoal-950/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-display text-2xl font-semibold text-cream">{tile.title}</h3>
                  <p className="mt-1 text-sm text-charcoal-200">{tile.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold-300 opacity-0 transition-opacity group-hover:opacity-100">
                    Explore <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Real marketplace inventory */}
      <section className="bg-sand px-4 py-16 md:py-20 dark:bg-charcoal-900/40">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
                On the marketplace
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal-900 dark:text-charcoal-100 md:text-4xl">
                Popular providers
              </h2>
            </div>
            <Link href="/search">
              <Button variant="outline">
                View all providers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((provider) => (
                <ListingCard
                  key={provider.id}
                  provider={{
                    ...provider,
                    totalReviews: provider._count.reviewsReceived,
                    coverImageUrl: provider.images?.[0] ?? null,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-charcoal-200 bg-white p-10 text-center text-charcoal-500 dark:border-charcoal-800 dark:bg-charcoal-900">
              Providers are being onboarded — check back soon, or explore by category above.
            </p>
          )}
        </div>
      </section>

      {/* Build your event — editorial timeline */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
              The Eventicate workflow
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal-900 dark:text-charcoal-100 md:text-4xl">
              Build your event in one place.
            </h2>
            <p className="mt-3 text-charcoal-600 dark:text-charcoal-300">
              From the first idea to the final booking — plan, source, compare, book and manage
              your whole event without juggling ten different apps.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-xl border border-charcoal-200 bg-charcoal-200 dark:border-charcoal-800 dark:bg-charcoal-800 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.step} className="bg-white p-7 dark:bg-charcoal-900">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-semibold text-primary-600 dark:text-primary-400">
                    {step.step}
                  </span>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden h-5 w-5 text-charcoal-300 dark:text-charcoal-700 md:block" />
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-charcoal-900 dark:text-charcoal-100">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-charcoal-600 dark:text-charcoal-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Provider CTA */}
      <section className="relative overflow-hidden bg-charcoal-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-400">
              For event businesses
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-cream md:text-4xl">
              Have a service people need?
            </h2>
            <p className="mt-4 text-charcoal-200">
              List your business on Eventicate and reach customers planning real events.
              Manage enquiries, availability, quotations, bookings and reviews — all in one place.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                "Reach new customers",
                "Manage enquiries",
                "Receive bookings",
                "Control availability",
                "Send quotations",
                "Track your business",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-charcoal-100">
                  <BadgeCheck className="h-4 w-4 text-gold-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/auth/register?role=provider" className="mt-8 inline-block">
              <Button variant="gold" size="lg">
                List Your Business
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="relative h-72 overflow-hidden rounded-xl md:h-[420px]">
            <Image
              src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80&auto=format&fit=crop"
              alt="An event professional at work"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-400">
              Why Eventicate
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-charcoal-900 dark:text-charcoal-100 md:text-4xl">
              A marketplace you can plan with confidence.
            </h2>
          </div>
          <div className="grid gap-x-8 gap-y-8 border-t border-charcoal-200 pt-10 dark:border-charcoal-800 md:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point) => (
              <div key={point.title} className="border-l-2 border-gold-400 pl-5">
                <point.icon className="h-6 w-6 text-primary-700 dark:text-primary-400" />
                <h3 className="mt-3 font-display text-lg font-semibold text-charcoal-900 dark:text-charcoal-100">
                  {point.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}