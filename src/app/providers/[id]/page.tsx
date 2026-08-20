import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StarRating } from "@/components/ui/Badge";
import { AutoScrollGallery } from "@/components/ui/AutoScrollGallery";
import { PublicAvailabilityCalendar } from "./PublicAvailabilityCalendar";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, parseJsonArray, getCurrencyForCountry } from "@/lib/utils";
import { MapPin, ShieldCheck, ArrowLeft } from "lucide-react";
import { SERVICE_CATEGORIES, EVENT_TYPES, CATEGORY_IMAGES } from "@/lib/constants";
import { CategoryIcon } from "@/components/layout/Navigation";
import { AddToCartButton } from "./AddToCartButton";
import Image from "next/image";
import { FadeUp } from "@/components/motion/animations";

interface ProviderReview {
  id: string;
  serviceQuality: number | null;
  professionalism: number | null;
  communication: number | null;
  comment: string | null;
  customerReviewer: { user: { firstName: string; lastName: string } } | null;
}

interface ProviderData {
  id: string;
  businessName: string;
  city: string | null;
  country: string | null;
  category: string;
  averageRating: number;
  travelOutsideArea: boolean;
  travelRadius: number | null;
  description: string | null;
  verificationStatus: string;
  coverImageUrl: string | null;
  logoUrl: string | null;
  totalReviews: number;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    images: string;
    basePrice: number;
    discountPercent: number;
    locationCity: string | null;
    locationCountry: string | null;
  }>;
  venues: Array<{
    id: string;
    name: string;
    description: string | null;
    location: string;
    capacity: number;
    facilities: string[];
    images: string[];
    basePrice: number;
  }>;
  menuPackages: Array<{
    id: string;
    name: string;
    basePrice: number;
    guestCount: number;
    servingStyle: string;
    includesDrinks: boolean;
    includesDessert: boolean;
    description: string | null;
    images: string[];
  }>;
  vehicles: Array<{
    id: string;
    name: string;
    type: string;
    capacity: number;
    description: string | null;
    images: string[];
    pricePerKm: number;
    basePrice: number;
  }>;
  photoPackages: Array<{
    id: string;
    name: string;
    type: string;
    description: string | null;
    coverageHours: number | null;
    images: string[];
    basePrice: number;
  }>;
  equipment: Array<{
    id: string;
    name: string;
    subcategory: string;
    quantity: number;
    images: string[];
    rentalPrice: number;
    discountPercent: number;
    locationCity: string | null;
    locationCountry: string | null;
  }>;
  pricingRules: Array<{
    id: string;
    name: string;
    eventType: string | null;
    isWeekend: boolean;
    isPeakSeason: boolean;
    modifierType: string;
    priceModifier: number;
  }>;
  reviewsReceived: ProviderReview[];
}

export default async function ProviderProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const { back } = await searchParams;
  const session = await getSession();

  // Preserve the visitor's search context when they arrived from the marketplace.
  const backHref = back && back.startsWith("/search") ? back : "/search";
  const backLabel = back ? "Back to results" : "Back to marketplace";

  const currency = getCurrencyForCountry(session?.country);
  const now = new Date();

  let provider: ProviderData | null = null;
  let availability: Array<{ id: string; date: string; status: string }> = [];

  try {
    const data = await serverApi<{
      provider: ProviderData;
      availability: Array<{ id: string; date: string; status: string }> | null;
    }>(`/api/providers/${id}?month=${now.getMonth()}&year=${now.getFullYear()}`);
    provider = data.provider;
    provider.reviewsReceived = provider.reviewsReceived.slice(0, 5);
    availability = data.availability ?? [];
  } catch {
    notFound();
  }

  if (!provider) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream p-4 text-center dark:bg-charcoal-950">
        <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
          Provider not found.
        </p>
        <Link
          href={backHref}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === provider.category)?.label;
  const coverImage = provider.coverImageUrl || CATEGORY_IMAGES[provider.category as keyof typeof CATEGORY_IMAGES] || CATEGORY_IMAGES.OTHER;

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-950">
      {/* Contextual navigation */}
      <div className="border-b border-charcoal-200 bg-white dark:border-charcoal-800 dark:bg-charcoal-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal-600 transition-colors hover:text-primary-700 dark:text-charcoal-300 dark:hover:text-primary-400"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-charcoal-400 dark:text-charcoal-500 sm:flex">
            <Link href="/" className="transition-colors hover:text-primary-700 dark:hover:text-primary-400">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/search" className="transition-colors hover:text-primary-700 dark:hover:text-primary-400">
              Marketplace
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-charcoal-700 dark:text-charcoal-200">{provider.businessName}</span>
          </nav>
        </div>
      </div>

      {/* Provider banner */}
      <div className="relative h-64 w-full bg-charcoal-900 md:h-72">
        <Image
          src={coverImage}
          alt={provider.businessName}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-950/40 to-charcoal-950/20" />
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-16 relative z-10">
          <div className="rounded-xl border border-charcoal-200 bg-white p-6 shadow-lg dark:border-charcoal-800 dark:bg-charcoal-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <CategoryIcon category={provider.category} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100 md:text-3xl">
                      {provider.businessName}
                    </h1>
                    {provider.verificationStatus === "VERIFIED" && (
                      <Badge variant="success" className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
                    {categoryLabel}
                    {provider.city && ` · ${provider.city}`}
                    {provider.country && `, ${provider.country}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <StarRating rating={provider.averageRating} size="md" />
                    <span className="text-sm text-charcoal-500 dark:text-charcoal-400">
                      {provider.totalReviews} review{provider.totalReviews === 1 ? "" : "s"}
                    </span>
                    {provider.travelOutsideArea && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Travels{provider.travelRadius ? ` ${provider.travelRadius}km` : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-auto">
                {session ? (
                  <Link href={`/dashboard/bookings/new?providerId=${id}`}>
                    <Button className="w-full sm:w-auto">Get a Quote</Button>
                  </Link>
                ) : (
                  <Link href="/auth/login">
                    <Button className="w-full sm:w-auto">Sign In to Book</Button>
                  </Link>
                )}
                <p className="mt-2 max-w-xs text-xs text-charcoal-500 dark:text-charcoal-400">
                  Prefer to compare first? Use <span className="font-medium">Add to Cart</span> on any
                  service and combine quotes from your cart.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {provider.description && (
              <FadeUp>
                <Card>
                  <CardTitle className="mb-2">About</CardTitle>
                  <p className="text-charcoal-600 dark:text-charcoal-200">{provider.description}</p>
                </Card>
              </FadeUp>
            )}

            {provider.services.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Services</CardTitle>
                <div className="space-y-3">
                  {provider.services.map((service) => {
                    const serviceImages = parseJsonArray<string>(service.images);
                    const hasDiscount = service.discountPercent > 0;
                    const discountedPrice = service.basePrice * (100 - service.discountPercent) / 100;
                    return (
<div key={service.id} className="rounded-lg border border-charcoal-200 p-3 dark:border-charcoal-800">
                        {serviceImages.length > 0 && (
                          <AutoScrollGallery
                            images={serviceImages}
                            alt={`${service.name} photo`}
                            aspectClass="h-36 w-full"
                            className="mb-2"
                          />
                        )}
                        <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{service.name}</p>
                              {service.description && (
                                <p className="text-sm text-charcoal-500 dark:text-charcoal-400">{service.description}</p>
                              )}
                              {(() => {
                                const loc = service.locationCity || service.locationCountry
                                  ? [service.locationCity || provider.city, service.locationCountry || provider.country]
                                  : [provider.city, provider.country];
                                const label = loc.filter(Boolean).join(", ");
                                return label ? (
                                  <p className="mt-1 flex items-center text-xs text-charcoal-500 dark:text-charcoal-400">
                                    <MapPin className="mr-1 inline h-3 w-3" />
                                    {label}
                                  </p>
                                ) : null;
                              })()}
                            </div>
                            <div className="flex items-center gap-3">
                              {hasDiscount && <Badge variant="warning">{service.discountPercent}% OFF</Badge>}
                              <div className="text-right">
                                {hasDiscount ? (
                                  <>
                                    <p className="text-sm text-charcoal-400 line-through">{formatCurrency(service.basePrice, currency)}</p>
                                    <p className="font-semibold text-primary-600">{formatCurrency(discountedPrice, currency)}</p>
                                  </>
                                ) : (
                                  <p className="font-semibold text-primary-600">{formatCurrency(service.basePrice, currency)}</p>
                                )}
                              </div>
                              <AddToCartButton serviceId={service.id} />
                            </div>
                          </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {provider.venues.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Venues</CardTitle>
                <div className="space-y-4">
                  {provider.venues.map((venue) => (
                    <div key={venue.id} className="rounded-lg border border-charcoal-200 p-4 dark:border-charcoal-800">
                      {venue.images.length > 0 && (
                        <AutoScrollGallery
                          images={venue.images}
                          alt={`${venue.name} photo`}
                          aspectClass="h-44 w-full"
                          className="mb-3"
                        />
                      )}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium">{venue.name}</h4>
                          <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            {venue.location}
                          </p>
                          <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                            Capacity: {venue.capacity} guests
                          </p>
                          {venue.facilities.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {venue.facilities.map((f, i) => (
                                <span key={i} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">From</p>
                            <p className="font-semibold text-primary-600">{formatCurrency(venue.basePrice, currency)}</p>
                          </div>
                          <Link href={session ? `/dashboard/bookings/new?providerId=${id}` : "/auth/login"}>
                            <Button size="sm" variant="outline">Get a Quote</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {provider.menuPackages.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Catering Packages</CardTitle>
                <div className="space-y-3">
                  {provider.menuPackages.map((pkg) => (
                    <div key={pkg.id} className="rounded-lg border border-charcoal-200 p-4 dark:border-charcoal-800">
                      {pkg.images.length > 0 && (
                        <AutoScrollGallery
                          images={pkg.images}
                          alt={`${pkg.name} photo`}
                          aspectClass="h-32 w-full"
                          className="mb-3"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{pkg.name}</h4>
                        <span className="font-semibold text-primary-600">
                          {formatCurrency(pkg.basePrice, currency)}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                        {pkg.guestCount} guests · {pkg.servingStyle}
                        {pkg.includesDrinks && " · Drinks included"}
                        {pkg.includesDessert && " · Dessert included"}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {provider.equipment.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Equipment</CardTitle>
                <div className="grid gap-3 md:grid-cols-2">
                  {provider.equipment.map((item) => {
                    const equipImages = item.images;
                    const hasDiscount = item.discountPercent > 0;
                    const discountedPrice = item.rentalPrice * (100 - item.discountPercent) / 100;
                    return (
                      <div key={item.id} className="rounded-lg border border-charcoal-200 p-3 dark:border-charcoal-800">
                        {equipImages.length > 0 && (
                          <AutoScrollGallery
                            images={equipImages}
                            alt={`${item.name} photo`}
                            aspectClass="h-32 w-full"
                            className="mb-2"
                          />
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{item.subcategory} · Qty: {item.quantity}</p>
                            {(() => {
                              const loc = item.locationCity || item.locationCountry
                                ? [item.locationCity || provider.city, item.locationCountry || provider.country]
                                : [provider.city, provider.country];
                              const label = loc.filter(Boolean).join(", ");
                              return label ? (
                                <p className="mt-1 flex items-center text-xs text-charcoal-500 dark:text-charcoal-400">
                                  <MapPin className="mr-1 inline h-3 w-3" />
                                  {label}
                                </p>
                              ) : null;
                            })()}
                          </div>
                          <div className="flex items-center gap-3">
                            {hasDiscount && <Badge variant="warning">{item.discountPercent}% OFF</Badge>}
                            <div className="text-right">
                              {hasDiscount ? (
                                <p className="text-sm">
                                  <span className="text-charcoal-400 line-through">{formatCurrency(item.rentalPrice, currency)}</span>{' '}
                                  <span className="font-semibold text-primary-600">{formatCurrency(discountedPrice, currency)}/day</span>
                                </p>
                              ) : (
                                <p className="text-sm text-primary-600">{formatCurrency(item.rentalPrice, currency)}/day</p>
                              )}
                            </div>
                            <AddToCartButton equipmentId={item.id} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {provider.vehicles.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Vehicles</CardTitle>
                <div className="grid gap-3 md:grid-cols-2">
                  {provider.vehicles.map((vehicle) => {
                    const vehicleImages = vehicle.images;
                    return (
                      <div key={vehicle.id} className="rounded-lg border border-charcoal-200 p-3 dark:border-charcoal-800">
                        {vehicleImages.length > 0 && (
                          <AutoScrollGallery
                            images={vehicleImages}
                            alt={`${vehicle.name} photo`}
                            aspectClass="h-32 w-full"
                            className="mb-2"
                          />
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{vehicle.name}</p>
                            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                              {vehicle.type} · Capacity: {vehicle.capacity}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm text-primary-600">{formatCurrency(vehicle.basePrice, currency)}/day</p>
                            </div>
                            <Link href={session ? `/dashboard/bookings/new?providerId=${id}` : "/auth/login"}>
                              <Button size="sm" variant="outline">Get a Quote</Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {provider.photoPackages.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Photo & Video Packages</CardTitle>
                <div className="grid gap-3 md:grid-cols-2">
                  {provider.photoPackages.map((pkg) => (
                    <div key={pkg.id} className="rounded-lg border border-charcoal-200 p-3 dark:border-charcoal-800">
                      {pkg.images.length > 0 && (
                        <AutoScrollGallery
                          images={pkg.images}
                          alt={`${pkg.name} photo`}
                          aspectClass="h-32 w-full"
                          className="mb-2"
                        />
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{pkg.name}</p>
                          <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                            {pkg.type}
                            {pkg.coverageHours ? ` · ${pkg.coverageHours}h coverage` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-primary-600">{formatCurrency(pkg.basePrice, currency)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {provider.pricingRules.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Dynamic Pricing</CardTitle>
                <div className="space-y-2">
                  {provider.pricingRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between text-sm">
                      <span>
                        {rule.eventType
                          ? EVENT_TYPES.find((e) => e.value === rule.eventType)?.label
                          : rule.name}
                        {rule.isWeekend && " (Weekend)"}
                        {rule.isPeakSeason && " (Peak Season)"}
                      </span>
                      <span className="font-medium">
                        {rule.modifierType === "multiplier"
                          ? `×${rule.priceModifier}`
                          : rule.modifierType === "percentage"
                          ? `+${rule.priceModifier}%`
                          : formatCurrency(rule.priceModifier, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {provider.reviewsReceived.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Reviews</CardTitle>
                <div className="space-y-4">
                  {provider.reviewsReceived.map((review) => (
                    <div key={review.id} className="border-b border-charcoal-100 pb-4 last:border-0 dark:border-charcoal-800">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">
                          {review.customerReviewer?.user.firstName}{" "}
                          {review.customerReviewer?.user.lastName}
                        </span>
                        <StarRating
                          rating={
                            (() => {
                              const scores = [review.serviceQuality, review.professionalism, review.communication].filter(
                                (s): s is number => s !== null && s !== undefined
                              );
                              return scores.length > 0
                                ? scores.reduce((sum, s) => sum + s, 0) / scores.length
                                : 0;
                            })()
                          }
                        />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-charcoal-600 dark:text-charcoal-200">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <PublicAvailabilityCalendar
              providerId={id}
              initialSlots={availability.map((a) => ({
                date: new Date(a.date).toISOString(),
                status: a.status as "AVAILABLE" | "PENDING" | "CONFIRMED" | "UNAVAILABLE",
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
