"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Check, X, Clock, CreditCard, Shield, Star, Loader2, Smartphone } from "lucide-react";
import type { PaymentGateway } from "@/lib/payments";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  annualPrice: number | null;
  trialDays: number;
  maxServices: number;
  maxEquipment: number;
  maxBookings: number;
  maxVenues: number;
  maxVehicles: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  trialStartAt: string | null;
  trialEndAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  billingPeriod: string;
  plan: Plan;
  daysRemaining?: number;
}

interface LimitsData {
  servicesUsed: number;
  equipmentUsed: number;
  bookingsUsed: number;
  venuesUsed: number;
  vehiclesUsed: number;
  maxServices: number;
  maxEquipment: number;
  maxBookings: number;
  maxVenues: number;
  maxVehicles: number;
}

const GATEWAYS: { value: PaymentGateway; label: string; icon: React.ReactNode }[] = [
  { value: "mpesa", label: "M-Pesa", icon: <Smartphone className="h-5 w-5" /> },
];

export default function ProviderSubscriptionPage() {
  const currency = useCurrency();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [limits, setLimits] = useState<LimitsData | null>(null);

  const [selectedBilling, setSelectedBilling] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>("mpesa");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "waiting" | "success" | "failed">("idle");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPayment) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPayment(false);
    };
    document.addEventListener("keydown", handleKey);
    modalRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [showPayment]);

  useEffect(() => {
    (async () => {
      const sessionRes = await fetch("/api/auth/session");
      const { user } = await sessionRes.json();
      if (!user || user.role !== "PROVIDER") {
        router.push("/auth/login");
        return;
      }
      setAuthorized(true);

      const [subRes, plansRes, checkRes] = await Promise.all([
        fetch("/api/provider/subscription"),
        fetch("/api/admin/subscription-plans"),
        fetch("/api/provider/subscription/check"),
      ]);

      const subData = await subRes.json();
      const plansData = await plansRes.json();
      const checkData = await checkRes.json();

      setSubscription(subData.subscription);
      interface RawPlan { id: string; name: string; description: string | null; price: number; annualPrice: number | null; trialDays: number; maxServices: number; maxEquipment: number; maxBookings: number; maxVenues: number; maxVehicles: number; features: string | string[]; isActive: boolean; sortOrder: number; }
      setPlans(
        (plansData.plans || []).map((p: RawPlan) => ({
          ...p,
          features: typeof p.features === "string" ? JSON.parse(p.features) : p.features,
        }))
      );
      setLimits(checkData.limits);
      setLoading(false);
    })();
  }, [router]);

  async function handleStartTrial() {
    setSubscribing(true);
    try {
      const res = await fetch("/api/provider/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } finally {
      setSubscribing(false);
    }
  }

  function getEffectivePrice(plan: Plan): number {
    if (selectedBilling === "ANNUAL") {
      return plan.annualPrice ?? plan.price * 12;
    }
    return plan.price;
  }

  function getSavingsPct(plan: Plan): number | null {
    if (plan.annualPrice == null) return null;
    return Math.round((1 - plan.annualPrice / (plan.price * 12)) * 100);
  }

  async function handleSubscribeClick(plan: Plan) {
    if (plan.price === 0) {
      setSubscribing(true);
      try {
        const res = await fetch("/api/provider/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id, billingPeriod: selectedBilling }),
        });
        if (res.ok) {
          const data = await res.json();
          setSubscription(data.subscription);
        }
      } finally {
        setSubscribing(false);
      }
      return;
    }
    setSelectedPlan(plan);
    setSelectedGateway("mpesa");
    setPaymentPhone("");
    setPaymentError("");
    setPaymentSuccess(false);
    setShowPayment(true);
  }

  async function handlePay() {
    if (!selectedPlan) return;
    setProcessing(true);
    setPaymentError("");
    setPaymentSuccess(false);
    setPaymentStatus("idle");

    try {
      const payRes = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: selectedGateway,
          bookingId: `sub_${selectedPlan.id}`,
          amount: getEffectivePrice(selectedPlan),
          currency,
          phone: selectedGateway === "mpesa" ? paymentPhone : undefined,
          billingPeriod: selectedBilling,
        }),
      });

      if (!payRes.ok) {
        const err = await payRes.json();
        setPaymentError(err.error || "Payment initiation failed");
        setPaymentStatus("failed");
        return;
      }

      const data = await payRes.json();
      if (!data.success || !data.checkoutRequestId) {
        setPaymentError(data.error || "Payment initiation failed");
        setPaymentStatus("failed");
        return;
      }

      setPaymentStatus("waiting");
      const checkoutRequestId: string = data.checkoutRequestId;

      let confirmed = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const statusRes = await fetch(
          `/api/payments/status?gateway=mpesa&transactionId=${checkoutRequestId}`
        );
        const statusData = await statusRes.json();

        if (statusData.status === "COMPLETED") {
          confirmed = true;
          break;
        }
        if (statusData.status === "FAILED") {
          setPaymentError(statusData.error || "Payment failed. Please try again.");
          setPaymentStatus("failed");
          return;
        }
      }

      if (!confirmed) {
        setPaymentError(
          "We couldn't confirm your payment. It may still be processing on M-Pesa — check the status on your booking page shortly."
        );
        setPaymentStatus("failed");
        return;
      }

      const subRes = await fetch("/api/provider/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id, billingPeriod: selectedBilling }),
      });

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
        setPaymentSuccess(true);
        setPaymentStatus("success");
        setShowPayment(false);
        router.refresh();
      } else {
        setPaymentError("Payment confirmed, but activation failed. Please contact support.");
        setPaymentStatus("failed");
      }
    } catch {
      setPaymentError("An unexpected error occurred");
      setPaymentStatus("failed");
    } finally {
      setProcessing(false);
    }
  }

  function limitLabel(val: number): string {
    if (val === -1) return "Unlimited";
    return String(val);
  }

  if (loading) return null;
  if (!authorized) return null;

  const isOnTrial = subscription?.status === "TRIAL";
  const isActive = subscription?.status === "ACTIVE";
  const isExpired = subscription && ["EXPIRED", "CANCELLED", "PAST_DUE"].includes(subscription.status);
  const noSubscription = !subscription;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Subscription</h1>
          <p className="text-sm text-charcoal-500 dark:text-charcoal-400 ">Manage your plan and billing</p>
        </div>

        {subscription && (
          <Card className="mb-8">
            <CardTitle className="mb-2">Current Plan</CardTitle>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-xl font-semibold text-charcoal-900 dark:text-charcoal-100">{subscription.plan.name}</h2>
                  <Badge
                    variant={
                      isActive ? "success" : isOnTrial ? "warning" : "danger"
                    }
                  >
                    {subscription.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-primary-600">
                  {subscription.plan.price === 0
                    ? "Free"
                    : formatCurrency(subscription.plan.price, currency) + "/month"}
                </p>
                {isOnTrial && subscription.daysRemaining !== undefined && (
                  <p className="flex items-center gap-2 text-sm text-gold-700 dark:text-gold-400">
                    <Clock className="h-4 w-4" />
                    {subscription.daysRemaining > 0
                      ? `${subscription.daysRemaining} day${subscription.daysRemaining !== 1 ? "s" : ""} remaining in trial`
                      : "Trial has expired"}
                  </p>
                )}
                {isActive && subscription.currentPeriodEnd && (
                  <p className="flex items-center gap-2 text-sm text-charcoal-500 dark:text-charcoal-400">
                    <CreditCard className="h-4 w-4" />
                    Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
                {subscription.plan.description && (
                  <p className="text-sm text-charcoal-500 dark:text-charcoal-400 ">
                    {subscription.plan.description}
                  </p>
                )}
              </div>
            </div>

            {limits && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Services", used: limits.servicesUsed, max: limits.maxServices },
                  { label: "Equipment", used: limits.equipmentUsed, max: limits.maxEquipment },
                  { label: "Bookings", used: limits.bookingsUsed, max: limits.maxBookings },
                  { label: "Venues", used: limits.venuesUsed, max: limits.maxVenues },
                  { label: "Vehicles", used: limits.vehiclesUsed, max: limits.maxVehicles },
                ].map((item) => {
                  const unlimited = item.max === -1;
                  const pct = unlimited ? 0 : (item.used / Math.max(item.max, 1)) * 100;
                  return (
                    <div key={item.label} className="rounded-lg border border-charcoal-200 dark:border-charcoal-800 p-3 ">
                      <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{item.label}</p>
                      <p className="text-lg font-bold">
                        {item.used}{" "}
                        <span className="text-sm font-normal text-charcoal-400 dark:text-charcoal-500">
                          / {unlimited ? "\u221E" : item.max}
                        </span>
                      </p>
                      {!unlimited && (
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-charcoal-100 dark:bg-charcoal-800 ">
                          <div
                            className={`h-full rounded-full ${pct >= 90 ? "bg-terracotta-50 dark:bg-terracotta-900/30" : pct >= 70 ? "bg-gold-500" : "bg-primary-500"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {noSubscription && (
          <Card className="mb-8 border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20">
            <div className="text-center py-6">
              <Shield className="mx-auto h-12 w-12 text-primary-500 mb-4" />
              <h2 className="font-display text-xl font-semibold text-charcoal-900 dark:text-charcoal-100 mb-2">Start Your 30-Day Free Trial</h2>
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400  mb-6 max-w-md mx-auto">
                Get full access to all features for 30 days. No credit card required.
              </p>
              <Button size="lg" onClick={handleStartTrial} disabled={subscribing}>
                {subscribing ? "Starting..." : "Start Free Trial"}
              </Button>
            </div>
          </Card>
        )}

        {isExpired && (
          <Card className="mb-8 border-terracotta-200 bg-terracotta-50 dark:border-terracotta-800 dark:bg-terracotta-900/30">
            <div className="text-center py-6">
              <X className="mx-auto h-12 w-12 text-terracotta-600 dark:text-terracotta-400 mb-4" />
              <h2 className="font-display text-xl font-semibold text-charcoal-900 dark:text-charcoal-100 mb-2">Subscription Expired</h2>
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400  mb-4">
                Your subscription has ended. Subscribe to a plan to continue using our services.
              </p>
            </div>
          </Card>
        )}

        <Card>
          <CardTitle className="mb-6">Available Plans</CardTitle>

          <div className="mb-6 flex items-center gap-4">
            <span className="text-sm text-charcoal-500 dark:text-charcoal-400 ">Billing period:</span>
            <div className="flex overflow-hidden rounded-lg border border-charcoal-300 dark:border-charcoal-700">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  selectedBilling === "MONTHLY"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-charcoal-700 hover:bg-sand dark:text-charcoal-200 dark:hover:bg-charcoal-800"
                }`}
                onClick={() => setSelectedBilling("MONTHLY")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  selectedBilling === "ANNUAL"
                    ? "bg-primary-600 text-white"
                    : "bg-white text-charcoal-700 hover:bg-sand dark:text-charcoal-200 dark:hover:bg-charcoal-800"
                }`}
                onClick={() => setSelectedBilling("ANNUAL")}
              >
                Annual
              </button>
            </div>
            {selectedBilling === "ANNUAL" && (
              <Badge variant="success">Annual billing</Badge>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrentPlan =
                subscription?.plan.id === plan.id &&
                (isActive || isOnTrial);
              const isFreePlan = plan.price === 0;
              const effectivePrice = getEffectivePrice(plan);

              const isSelected = selectedPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border p-6 cursor-pointer transition-colors ${
                    isCurrentPlan
                      ? "border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800"
                      : isSelected
                      ? "border-primary-400 ring-1 ring-primary-200 dark:ring-primary-700"
                      : "border-charcoal-200 dark:border-charcoal-800  hover:border-charcoal-300 dark:hover:border-charcoal-600"
                  }`}
                  onClick={() => {
                    if (isCurrentPlan) return;
                    setSelectedPlanId(isSelected ? null : plan.id);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="plan"
                        checked={isSelected}
                        disabled={isCurrentPlan}
                        onChange={() => {
                          if (isCurrentPlan) return;
                          setSelectedPlanId(isSelected ? null : plan.id);
                        }}
                        className="h-4 w-4 rounded-full border-charcoal-300 dark:border-charcoal-700 text-primary-600 focus:ring-primary-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <h3 className="font-display text-lg font-semibold text-charcoal-900 dark:text-charcoal-100">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-xs text-charcoal-500 dark:text-charcoal-400 ">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="success">Current</Badge>
                    )}
                  </div>
                  <p className="mb-4 text-3xl font-bold">
                    {plan.price === 0 ? (
                      "Free"
                    ) : (
                      <>
                        {formatCurrency(effectivePrice, currency)}
                        <span className="text-sm font-normal text-charcoal-400 dark:text-charcoal-500">
                          {selectedBilling === "ANNUAL" ? "/yr" : "/mo"}
                        </span>
                        {selectedBilling === "ANNUAL" && plan.price > 0 && getSavingsPct(plan) != null && (
                          <Badge variant="success" className="ml-2">
                            Save {getSavingsPct(plan)}%
                          </Badge>
                        )}
                      </>
                    )}
                  </p>
                  <ul className="mb-6 space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                      {limitLabel(plan.maxServices)} services
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                      {limitLabel(plan.maxEquipment)} equipment
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                      {limitLabel(plan.maxBookings)} bookings
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                      {limitLabel(plan.maxVenues)} venues
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-olive-600 dark:text-olive-400" />
                      {limitLabel(plan.maxVehicles)} vehicles
                    </li>
                    {plan.features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-gold-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!isCurrentPlan && (
                    <Button
                      className="w-full"
                      variant={isFreePlan ? "outline" : "primary"}
                      onClick={(e) => { e.stopPropagation(); handleSubscribeClick(plan); }}
                      disabled={subscribing}
                    >
                      {subscribing
                        ? "Processing..."
                        : isFreePlan
                        ? "Downgrade"
                        : "Subscribe"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {showPayment && selectedPlan && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <div
              ref={modalRef}
              tabIndex={-1}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl outline-none dark:bg-charcoal-900"
            >
              <h3 id="payment-modal-title" className="font-display mb-4 text-lg font-semibold text-charcoal-900 dark:text-charcoal-100">Complete Payment</h3>

              <div className="mb-4 rounded-lg border border-charcoal-200 dark:border-charcoal-800 p-4 ">
                <p className="text-sm text-charcoal-500 dark:text-charcoal-400 ">{selectedPlan.name}</p>
                <p className="mt-1 text-2xl font-bold text-primary-600">
                  {formatCurrency(getEffectivePrice(selectedPlan), currency)}
                  <span className="text-sm font-normal text-charcoal-400 dark:text-charcoal-500">
                    {" "}{selectedBilling === "ANNUAL" ? "/yr" : "/mo"}
                  </span>
                </p>
              </div>

              <div className="mb-4 space-y-2">
                <p className="text-sm font-medium text-charcoal-700 dark:text-charcoal-200">Payment Method</p>
                {GATEWAYS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      selectedGateway === g.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-charcoal-200 dark:border-charcoal-800 hover:bg-sand dark:hover:bg-charcoal-800  "
                    }`}
                    onClick={() => setSelectedGateway(g.value)}
                  >
                    {g.icon}
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>

              {selectedGateway === "mpesa" && (
                <Input
                  label="M-Pesa Phone Number"
                  placeholder="+254700000000"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  className="mb-4"
                />
              )}

              {paymentError && (
                <p className="mb-4 text-sm text-terracotta-600 dark:text-terracotta-400">{paymentError}</p>
              )}

              {paymentStatus === "waiting" && (
                <div className="mb-4 flex items-center gap-2 text-sm text-charcoal-600 dark:text-charcoal-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  STK push sent! Enter your M-Pesa PIN to confirm the payment...
                </div>
              )}

              {paymentSuccess ? (
                <div className="mb-4 flex items-center gap-2 text-sm text-olive-700 dark:text-olive-400">
                  <Check className="h-4 w-4" />
                  Payment successful! Activating subscription...
                </div>
              ) : null}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPayment(false)}
                  disabled={processing || paymentStatus === "waiting"}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePay}
                  disabled={processing || paymentSuccess || paymentStatus === "waiting"}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Pay Now"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageContent>
    </div>
  );
}
