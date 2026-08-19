"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { EVENT_TYPES, SERVICE_CATEGORIES } from "@/lib/constants";
import { Calculator, BarChart3, TrendingUp, PiggyBank, Crown } from "lucide-react";

interface CategoryEstimate {
  avg: number;
  min: number;
  max: number;
}

interface BudgetResult {
  estimates: Record<string, CategoryEstimate>;
  total: CategoryEstimate;
}

const CATEGORY_ORDER = ["VENUE", "CATERING", "PA_SYSTEM", "PHOTOGRAPHY", "TRANSPORT", "DECORATION"];

export default function BudgetPage() {
  const currency = useCurrency();
  const [eventType, setEventType] = useState("WEDDING");
  const [guestCount, setGuestCount] = useState(100);
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams({ eventType, guestCount: String(guestCount) });
      if (location) params.set("location", location);
      const res = await fetch(`/api/budget?${params}`);
      const data = await res.json();
      setResult(data);
    } catch {
      alert("Failed to fetch estimates");
    } finally {
      setLoading(false);
    }
  };

  const maxEstimate = result
    ? Math.max(...CATEGORY_ORDER.map((c) => result.estimates[c]?.max || 0), 1)
    : 1;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-charcoal-900 dark:text-charcoal-100">
            Budget Calculator
          </h1>
          <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
            Estimate what your event will cost based on real provider pricing.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary-700 dark:text-primary-300" />
                <CardTitle>Event Details</CardTitle>
              </div>
              <form onSubmit={handleEstimate} className="space-y-4">
                <Select
                  label="Event Type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                />
                <Input
                  label="Expected Guests"
                  type="number"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  min={1}
                  required
                />
                <Input
                  label="Location (optional)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kampala"
                />
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? "Calculating..." : "Get Estimate"}
                </Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!result && (
              <Card>
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                    <BarChart3 className="h-7 w-7" />
                  </span>
                  <div>
                    <CardTitle className="text-center">Enter event details to see estimates</CardTitle>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-charcoal-500 dark:text-charcoal-400">
                      Get cost breakdowns based on real provider pricing in the system.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {result && (
              <>
                <Card>
                  <CardTitle className="mb-4">Cost Breakdown</CardTitle>
                  <div className="space-y-4">
                    {CATEGORY_ORDER.map((cat) => {
                      const est = result.estimates[cat];
                      if (!est || est.avg === 0) return null;
                      const catInfo = SERVICE_CATEGORIES.find((c) => c.value === cat);
                      const barWidth = (est.avg / maxEstimate) * 100;
                      return (
                        <div key={cat}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {catInfo?.icon ? <catInfo.icon className="h-4 w-4 text-primary-700 dark:text-primary-300" /> : null}
                              <span className="font-medium text-charcoal-900 dark:text-charcoal-100">
                                {catInfo?.label || cat}
                              </span>
                            </div>
                            <span className="font-semibold text-primary-700 dark:text-primary-400">
                              {formatCurrency(est.avg, currency)}
                            </span>
                          </div>
                          <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-charcoal-100 dark:bg-charcoal-800">
                            <div
                              className="h-2 rounded-full bg-gold-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-charcoal-400 dark:text-charcoal-500">
                            <span>Min: {formatCurrency(est.min, currency)}</span>
                            <span>Max: {formatCurrency(est.max, currency)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary-700 dark:text-primary-300" />
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Estimated Total (Avg)</p>
                    </div>
                    <p className="mt-2 font-display text-2xl font-semibold text-primary-700 dark:text-primary-400">
                      {formatCurrency(result.total.avg, currency)}
                    </p>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 text-olive-700 dark:text-olive-400" />
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Budget Friendly</p>
                    </div>
                    <p className="mt-2 font-display text-2xl font-semibold text-olive-700 dark:text-olive-400">
                      {formatCurrency(result.total.min, currency)}
                    </p>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-gold-600 dark:text-gold-400" />
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Premium Options</p>
                    </div>
                    <p className="mt-2 font-display text-2xl font-semibold text-gold-600 dark:text-gold-400">
                      {formatCurrency(result.total.max, currency)}
                    </p>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </PageContent>
    </div>
  );
}