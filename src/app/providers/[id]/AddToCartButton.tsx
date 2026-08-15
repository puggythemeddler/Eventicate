"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ShoppingCart, Check } from "lucide-react";

interface AddToCartButtonProps {
  serviceId?: string;
  equipmentId?: string;
  label?: string;
}

export function AddToCartButton({ serviceId, equipmentId, label }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: serviceId || undefined,
          equipmentId: equipmentId || undefined,
          quantity: 1,
        }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleAdd} disabled={loading} size="sm" variant={added ? "secondary" : "outline"}>
      {added ? (
        <><Check className="mr-1 h-4 w-4" /> Added</>
      ) : (
        <><ShoppingCart className="mr-1 h-4 w-4" /> {label || "Add to Cart"}</>
      )}
    </Button>
  );
}
