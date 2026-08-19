import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const DISCOVER_LINKS = [
  { href: "/search", label: "Explore Marketplace" },
  { href: "/search?category=VENUE", label: "Venues" },
  { href: "/search?category=CATERING", label: "Catering" },
  { href: "/search?category=TENTS", label: "Rentals" },
  { href: "/search?category=ENTERTAINMENT", label: "Entertainment" },
];

const PROVIDER_LINKS = [
  { href: "/auth/register?role=provider", label: "List Your Business" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/auth/register?role=provider", label: "Provider Dashboard" },
  { href: "/search", label: "Start Planning" },
];

const COMPANY_LINKS = [
  { href: "/search", label: "Create an Event" },
  { href: "/how-it-works", label: "Get Help" },
  { href: "/auth/login", label: "Sign In" },
  { href: "/auth/register", label: "Create an Account" },
];

export function Footer() {
  return (
    <footer className="border-t border-charcoal-800 bg-charcoal-950 text-charcoal-300">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo tone="light" markClassName="h-9 w-9" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-charcoal-400">
              The event marketplace and planning platform. Discover venues, services, rentals
              and professionals — and manage your whole event in one place.
            </p>
            <p className="mt-6 text-sm font-medium text-charcoal-300">Serving Kenya · Uganda · Tanzania</p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-charcoal-500">Discover</h3>
            <ul className="space-y-2.5">
              {DISCOVER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-charcoal-300 transition-colors hover:text-gold-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-charcoal-500">For Providers</h3>
            <ul className="space-y-2.5">
              {PROVIDER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-charcoal-300 transition-colors hover:text-gold-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-charcoal-500">Company</h3>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-charcoal-300 transition-colors hover:text-gold-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-charcoal-800 pt-6 sm:flex-row">
          <p className="text-sm text-charcoal-500">
            © {new Date().getFullYear()} Eventicate. All rights reserved.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}