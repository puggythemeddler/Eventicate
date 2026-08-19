import Link from "next/link";
import Image from "next/image";
import { MapPin, ShieldCheck } from "lucide-react";
import { StarRating } from "@/components/ui/Badge";
import { CATEGORY_IMAGES, SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
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
    verificationStatus?: string;
    images?: string[];
    coverImageUrl?: string | null;
    services?: { name: string; basePrice: number }[];
  };
  className?: string;
}

export function ListingCard({ provider, className }: ListingCardProps) {
  const categoryKey = provider.category as ServiceCategory;
  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === categoryKey)?.label ?? "Provider";
  const image = provider.images?.[0] || provider.coverImageUrl || CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES.OTHER;
  const isVerified = provider.verificationStatus === "VERIFIED";
  const fromPrice = provider.services?.[0]?.basePrice;
  const currency = getCurrencyForCountry(provider.country);

  return (
    <Link
      href={`/providers/${provider.id}`}
      className={cn(
        "group block overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-charcoal-300 hover:shadow-lg dark:border-charcoal-800 dark:bg-charcoal-900 dark:hover:border-charcoal-700",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-charcoal-200 dark:bg-charcoal-800">
        <Image
          src={image}
          alt={provider.businessName}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/60 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 rounded-md bg-charcoal-950/70 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-cream backdrop-blur-sm">
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
          <MapPin className="h-3.5 w-3.5" />
          {provider.city && `${provider.city}, `}
          {provider.country || "East Africa"}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <StarRating rating={provider.averageRating} />
          <span className="text-xs text-charcoal-500 dark:text-charcoal-400">
            {provider.totalReviews ?? 0} review{provider.totalReviews === 1 ? "" : "s"}
          </span>
        </div>

        {fromPrice != null && (
          <p className="mt-3 border-t border-charcoal-100 pt-3 text-sm text-charcoal-500 dark:border-charcoal-800 dark:text-charcoal-400">
            From{" "}
            <span className="font-semibold text-charcoal-900 dark:text-charcoal-100">
              {formatCurrency(fromPrice, currency)}
            </span>
          </p>
        )}
      </div>
    </Link>
  );
}