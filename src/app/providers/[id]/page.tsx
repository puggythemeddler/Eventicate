import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StarRating } from "@/components/ui/Badge";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import prisma from "@/lib/prisma";
import { formatCurrency, parseJsonArray } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { SERVICE_CATEGORIES, EVENT_TYPES } from "@/lib/constants";
import { CategoryIcon } from "@/components/layout/Navigation";
import { AddToCartButton } from "./AddToCartButton";
import Image from "next/image";

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      services: { where: { isActive: true } },
      venues: { where: { isActive: true } },
      equipment: { where: { isActive: true } },
      menuPackages: { where: { isActive: true } },
      photoPackages: { where: { isActive: true } },
      pricingRules: { where: { isActive: true } },
      reviewsReceived: {
        where: { isPublic: true },
        include: {
          customerReviewer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        take: 5,
      },
    },
  });

  if (!provider) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Provider not found</p>
      </div>
    );
  }

  const now = new Date();
  const availability = await prisma.availabilitySlot.findMany({
    where: {
      providerId: id,
      date: {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
        lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      },
    },
  });

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === provider.category)?.label;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="gradient-hero px-4 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20">
              <CategoryIcon category={provider.category} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{provider.businessName}</h1>
              <p className="text-primary-100">{categoryLabel}{provider.city && ` · ${provider.city}`}{provider.country && `, ${provider.country}`}</p>
              <div className="flex items-center gap-2">
                <StarRating rating={provider.averageRating} size="md" />
                {provider.travelOutsideArea && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Travels{provider.travelRadius ? ` ${provider.travelRadius}km` : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {provider.description && (
              <Card>
                <CardTitle className="mb-2">About</CardTitle>
                <p className="text-gray-600 dark:text-gray-300">{provider.description}</p>
              </Card>
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
                      <div key={service.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                        {serviceImages.length > 0 && (
                          <div className="mb-2 flex gap-2 overflow-x-auto">
                            {serviceImages.map((url, i) => (
                              <Image key={i} src={url} alt="" width={64} height={48} className="h-12 w-16 flex-shrink-0 rounded object-cover" />
                            ))}
                          </div>
                        )}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{service.name}</p>
                              {service.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{service.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {hasDiscount && <Badge variant="warning">{service.discountPercent}% OFF</Badge>}
                              <div className="text-right">
                                {hasDiscount ? (
                                  <>
                                    <p className="text-sm text-gray-400 line-through">{formatCurrency(service.basePrice)}</p>
                                    <p className="font-semibold text-primary-600">{formatCurrency(discountedPrice)}</p>
                                  </>
                                ) : (
                                  <p className="font-semibold text-primary-600">{formatCurrency(service.basePrice)}</p>
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

            {provider.menuPackages.length > 0 && (
              <Card>
                <CardTitle className="mb-4">Catering Packages</CardTitle>
                <div className="space-y-3">
                  {provider.menuPackages.map((pkg) => (
                    <div key={pkg.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{pkg.name}</h4>
                        <span className="font-semibold text-primary-600">
                          {formatCurrency(pkg.basePrice)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
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
                    const equipImages = parseJsonArray<string>(item.images);
                    const hasDiscount = item.discountPercent > 0;
                    const discountedPrice = item.rentalPrice * (100 - item.discountPercent) / 100;
                    return (
                      <div key={item.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                        {equipImages.length > 0 && (
                          <div className="mb-2 flex gap-2 overflow-x-auto">
                            {equipImages.map((url, i) => (
                              <Image key={i} src={url} alt="" width={64} height={48} className="h-12 w-16 flex-shrink-0 rounded object-cover" />
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.subcategory} · Qty: {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasDiscount && <Badge variant="warning">{item.discountPercent}% OFF</Badge>}
                            <div className="text-right">
                              {hasDiscount ? (
                                <p className="text-sm">
                                  <span className="text-gray-400 line-through">{formatCurrency(item.rentalPrice)}</span>{' '}
                                  <span className="font-semibold text-primary-600">{formatCurrency(discountedPrice)}/day</span>
                                </p>
                              ) : (
                                <p className="text-sm text-primary-600">{formatCurrency(item.rentalPrice)}/day</p>
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
                          : formatCurrency(rule.priceModifier)}
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
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 dark:border-gray-800">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">
                          {review.customerReviewer?.user.firstName}{" "}
                          {review.customerReviewer?.user.lastName}
                        </span>
                        <StarRating
                          rating={
                            [review.serviceQuality, review.professionalism, review.communication]
                              .filter(Boolean)
                              .reduce((a, b) => a! + b!, 0)! /
                            [review.serviceQuality, review.professionalism, review.communication]
                              .filter(Boolean).length
                          }
                        />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <AvailabilityCalendar
              slots={availability.map((a) => ({
                date: a.date.toISOString(),
                status: a.status,
              }))}
              month={now.getMonth()}
              year={now.getFullYear()}
              onMonthChange={() => {}}
            />

            {session ? (
              <Link href={`/dashboard/bookings/new?providerId=${id}`}>
                <Button className="w-full">Request Quotation</Button>
              </Link>
            ) : (
              <Link href="/auth/login">
                <Button className="w-full">Sign In to Book</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
