"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import Image from "next/image";
import { ShoppingCart, Plus, Minus, Trash2, FileText, Loader2 } from "lucide-react";

interface ProviderInfo {
  id: string;
  businessName: string;
}

interface ServiceInfo {
  id: string;
  name: string;
  basePrice: number;
  images: string;
  provider: ProviderInfo;
}

interface EquipmentInfo {
  id: string;
  name: string;
  rentalPrice: number;
  images: string;
  provider: ProviderInfo;
}

interface CartItem {
  id: string;
  quantity: number;
  notes: string | null;
  service: ServiceInfo | null;
  equipment: EquipmentInfo | null;
}

interface ProviderGroup {
  provider: ProviderInfo;
  items: CartItem[];
}

export default function CartPage() {
  const currency = useCurrency();
  const [items, setItems] = useState<CartItem[]>([]);
  const [grouped, setGrouped] = useState<ProviderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setGrouped(data.grouped || []);
      } else {
        setError(data.error || "Failed to load cart");
      }
    } catch {
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    const res = await fetch(`/api/cart/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (res.ok) fetchCart();
  };

  const removeItem = async (itemId: string) => {
    const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
    if (res.ok) fetchCart();
  };

  const clearCart = async () => {
    await fetch("/api/cart", { method: "DELETE" });
    fetchCart();
  };

  const getItemName = (item: CartItem) => item.service?.name || item.equipment?.name || "Unknown Item";
  const getUnitPrice = (item: CartItem) => item.service?.basePrice || item.equipment?.rentalPrice || 0;
  const getSubtotal = (item: CartItem) => getUnitPrice(item) * item.quantity;
  const getItemImage = (item: CartItem) => {
    const raw = item.service?.images || item.equipment?.images || "[]";
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    } catch {
      return null;
    }
  };

  const providerTotals = grouped.map((g) => ({
    providerId: g.provider.id,
    total: g.items.reduce((sum, item) => sum + getSubtotal(item), 0),
  }));
  const grandTotal = providerTotals.reduce((sum, pt) => sum + pt.total, 0);

  const generateQuotes = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/quotes/generate-from-cart", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.documents?.length > 0) {
        window.location.href = `/dashboard/documents?ids=${data.documents.map((d: { id: string }) => d.id).join(",")}`;
      } else {
        setError(data.error || "Failed to generate quotes");
      }
    } catch {
      setError("Failed to generate quotes");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="CUSTOMER" />
        <PageContent>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shopping Cart</h1>
            <p className="text-sm text-gray-500">{items.length} item(s)</p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" onClick={clearCart}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cart
            </Button>
          )}
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        {items.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-4 py-12">
              <ShoppingCart className="h-16 w-16 text-gray-300" />
              <CardTitle>Your cart is empty</CardTitle>
              <p className="text-sm text-gray-500">Browse services and equipment to add items to your cart.</p>
              <Link href="/search">
                <Button>Browse Services</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <div className="mb-6 space-y-6">
              {grouped.map((group) => {
                const pt = providerTotals.find((t) => t.providerId === group.provider.id);
                return (
                  <Card key={group.provider.id}>
                    <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <p className="text-lg font-semibold">{group.provider.businessName}</p>
                        <p className="text-xs text-gray-500">{group.items.length} item(s)</p>
                      </div>
                      <p className="text-lg font-bold text-primary-600">
                        {pt ? formatCurrency(pt.total, currency) : ""}
                      </p>
                    </div>
                    <div className="space-y-4">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 rounded-lg border border-gray-100 p-3"
                        >
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {getItemImage(item) ? (
                              <Image
                                src={getItemImage(item)!}
                                alt={getItemName(item)}
                                width={64}
                                height={64}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400 text-xs">
                                No img
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{getItemName(item)}</p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(getUnitPrice(item), currency)} each
                            </p>
                            {item.notes && (
                              <p className="text-xs text-gray-400 italic">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label={`Decrease quantity of ${getItemName(item)}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label={`Increase quantity of ${getItemName(item)}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="w-24 text-right">
                            <p className="font-medium">{formatCurrency(getSubtotal(item), currency)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label={`Remove ${getItemName(item)} from cart`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Grand Total</p>
                  <p className="text-xs text-gray-500">{grouped.length} provider(s)</p>
                </div>
                <p className="text-2xl font-bold text-primary-600">{formatCurrency(grandTotal, currency)}</p>
              </div>
            </Card>

            <Button onClick={generateQuotes} disabled={generating} className="w-full" size="lg">
              {generating ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
              ) : (
                <><FileText className="mr-2 h-5 w-5" /> Get Quotes ({grouped.length} provider{grouped.length > 1 ? "s" : ""})</>
              )}
            </Button>
          </>
        )}
      </PageContent>
    </div>
  );
}
