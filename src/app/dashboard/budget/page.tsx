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
import { Calculator, BarChart3 } from "lucide-react";

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Budget Calculator</h1>
            <p className="text-sm text-gray-500">Estimate costs based on real provider data</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <Card>
              <CardTitle className="mb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Event Details
                </div>
              </CardTitle>
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
                  placeholder="e.g. Lagos"
                />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Calculating..." : "Get Estimate"}
                </Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!result && (
              <Card>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="mb-4 h-12 w-12 text-gray-300" />
                  <CardTitle>Enter event details to see estimates</CardTitle>
                  <p className="mt-2 text-sm text-gray-500">
                    Get cost breakdowns based on real provider pricing in the system.
                  </p>
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
                              {catInfo?.icon ? <catInfo.icon className="h-4 w-4 text-primary-600" /> : null}
                              <span className="font-medium">{catInfo?.label || cat}</span>
                            </div>
                            <span className="text-primary-600 font-medium">{formatCurrency(est.avg, currency)}</span>
                          </div>
                          <div className="mb-1 h-2 w-full rounded-full bg-gray-100">
                            <div
                              className="h-2 rounded-full bg-primary-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
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
                    <p className="text-xs text-gray-500">Estimated Total (Avg)</p>
                    <p className="text-2xl font-bold text-primary-600">{formatCurrency(result.total.avg, currency)}</p>
                  </Card>
                  <Card>
                    <p className="text-xs text-gray-500">Budget Friendly</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(result.total.min, currency)}</p>
                  </Card>
                  <Card>
                    <p className="text-xs text-gray-500">Premium Options</p>
                    <p className="text-2xl font-bold text-amber-600">{formatCurrency(result.total.max, currency)}</p>
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
