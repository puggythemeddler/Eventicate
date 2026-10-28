import Link from "next/link";
import Image from "next/image";
import { MapPin, ShieldCheck } from "lucide-react";
import { StarRating } from "@/components/ui/Badge";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { formatCurrency, getCurrencyForCountry } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  provider: {
    id: string;
    businessName: string;
    description?: string | null;
    category: string;
    city?: string | null;
    country?: string | null;
    averageRating: number;
    totalReviews?: number;
    _count?: { reviewsReceived: number };
    verificationStatus?: string;
    images?: string[];
    coverImageUrl?: string | null;
    services?: { name: string; basePrice: number }[];
  };
  className?: string;
  /** Optional destination to return to (e.g. the search results page with filters preserved). */
  backHref?: string;
}

export function ListingCard({ provider, className, backHref }: ListingCardProps) {
  const categoryKey = provider.category as ServiceCategory;
  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === categoryKey)?.label ?? "Provider";
  const image = provider.images?.[0] || provider.coverImageUrl;
  const isVerified = provider.verificationStatus === "VERIFIED";
  const reviewCount = provider.totalReviews ?? provider._count?.reviewsReceived ?? 0;
  const hasRating = reviewCount > 0 && Number.isFinite(provider.averageRating) && provider.averageRating > 0;
  const prices = provider.services?.map((service) => Number(service.basePrice))
    .filter((price) => Number.isFinite(price) && price >= 0) ?? [];
  const fromPrice = prices.length > 0 ? Math.min(...prices) : null;
  const currency = getCurrencyForCountry(provider.country);
  const href = backHref
    ? `/providers/${provider.id}?back=${encodeURIComponent(backHref)}`
    : `/providers/${provider.id}`;

  return (
    <Link
      href={href}
      className={cn(
        "group block overflow-hidden rounded-xl bg-sand transition-colors hover:bg-charcoal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 dark:bg-charcoal-900 dark:hover:bg-charcoal-800",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-charcoal-200 dark:bg-charcoal-800">
        {image ? <Image
          src={image}
          alt={provider.businessName}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
        /> : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span aria-hidden="true" className="font-display text-5xl text-charcoal-600 dark:text-charcoal-300">
              {provider.businessName.trim().slice(0, 1)}
            </span>
            <span className="text-sm text-charcoal-600 dark:text-charcoal-300">This business hasn’t added a photo yet.</span>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-md bg-charcoal-950 px-2 py-1 text-xs font-medium text-cream">
          {categoryLabel}
        </div>
        {isVerified && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-gold-500/95 px-2 py-1 text-[11px] font-semibold text-charcoal-950">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-charcoal-900 group-hover:text-primary-700 dark:text-charcoal-100 dark:group-hover:text-primary-300">
          {provider.businessName}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-charcoal-500 dark:text-charcoal-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {[provider.city, provider.country].filter(Boolean).join(", ") || "Location not listed"}
        </p>

        {provider.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">{provider.description}</p>
        )}

        <div className="mt-2 flex items-center justify-between">
          {reviewCount > 0 ? (
            <>
              {hasRating && <StarRating rating={provider.averageRating} />}
              <span className="text-sm text-charcoal-600 dark:text-charcoal-300">
                {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </span>
            </>
          ) : <p className="text-sm text-charcoal-600 dark:text-charcoal-300">No reviews yet</p>}
        </div>

        {fromPrice != null && (
          <p className="mt-3 text-sm text-charcoal-600 dark:text-charcoal-300">
            Listed services from{" "}
            <span className="font-semibold text-charcoal-900 dark:text-charcoal-100">
              {formatCurrency(fromPrice, currency)}
            </span>
          </p>
        )}
        <p className="mt-3 text-sm font-medium text-primary-700 dark:text-primary-300">View services & details <span aria-hidden="true">→</span></p>
      </div>
    </Link>
  );
}
