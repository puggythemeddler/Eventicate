"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EventicateLogo } from "@/components/ui/EventicateLogo";
import {
  Calendar, Home, MessageSquare, Search, Star, User,
  LayoutDashboard, Package, Settings, Truck, Music,
  Camera, UtensilsCrossed, Building2, RefreshCw, BarChart3,
  CreditCard, Palette, FileText, MapPin, ShoppingCart,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const customerNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
  { href: "/dashboard/events", label: "My Events", icon: <Calendar className="h-4 w-4" /> },
  { href: "/search", label: "Find Services", icon: <Search className="h-4 w-4" /> },
  { href: "/dashboard/cart", label: "Cart", icon: <ShoppingCart className="h-4 w-4" /> },
  { href: "/dashboard/bookings", label: "Bookings", icon: <Package className="h-4 w-4" /> },
  { href: "/dashboard/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { href: "/dashboard/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
];

const providerNav: NavItem[] = [
  { href: "/provider", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/provider/bookings", label: "Bookings", icon: <Package className="h-4 w-4" /> },
  { href: "/provider/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> },
  { href: "/provider/calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> },
  { href: "/provider/services", label: "Services", icon: <Building2 className="h-4 w-4" /> },
  { href: "/provider/equipment", label: "Equipment", icon: <Music className="h-4 w-4" /> },
  { href: "/provider/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
  { href: "/provider/reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> },
  { href: "/provider/local-sync", label: "Local Sync", icon: <RefreshCw className="h-4 w-4" /> },
  { href: "/provider/subscription", label: "Subscription", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/provider/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/admin/users", label: "Users", icon: <User className="h-4 w-4" /> },
  { href: "/admin/providers", label: "Providers", icon: <Building2 className="h-4 w-4" /> },
  { href: "/admin/complaints", label: "Complaints", icon: <MessageSquare className="h-4 w-4" /> },
  { href: "/admin/locations", label: "Locations", icon: <MapPin className="h-4 w-4" /> },
  { href: "/admin/subscription-plans", label: "Subscriptions", icon: <CreditCard className="h-4 w-4" /> },
  { href: "/admin/branding", label: "Branding", icon: <Palette className="h-4 w-4" /> },
];

export function Sidebar({ role }: { role: "CUSTOMER" | "PROVIDER" | "ADMIN" }) {
  const pathname = usePathname();
  const nav = role === "ADMIN" ? adminNav : role === "PROVIDER" ? providerNav : customerNav;
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (role !== "CUSTOMER") return;
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => {
        const count = data.items?.length ?? 0;
        setCartCount(count);
      })
      .catch(() => {});
  }, [role]);

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 p-6 dark:border-gray-800">
        <Link href="/">
          <EventicateLogo className="h-8" />
        </Link>
        <p className="text-xs text-gray-500 capitalize dark:text-gray-400">{role.toLowerCase()} Portal</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.label === "Cart" && cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <ThemeToggle className="w-full" />
      </div>
    </aside>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/">
          <EventicateLogo className="h-8" />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/search" className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
            Find Services
          </Link>
          <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
            How It Works
          </Link>
          <ThemeToggle />
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, React.ReactNode> = {
    VENUE: <Building2 className="h-5 w-5" />,
    PA_SYSTEM: <Music className="h-5 w-5" />,
    CATERING: <UtensilsCrossed className="h-5 w-5" />,
    TRANSPORT: <Truck className="h-5 w-5" />,
    PHOTOGRAPHY: <Camera className="h-5 w-5" />,
    VIDEOGRAPHY: <Camera className="h-5 w-5" />,
  };
  return icons[category] || <Package className="h-5 w-5" />;
}
