"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EventicateLogo } from "@/components/ui/EventicateLogo";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  Calendar, Home, MessageSquare, Search, Star, User,
  LayoutDashboard, Package, Settings, Truck, Music,
  Camera, UtensilsCrossed, Building2, RefreshCw, BarChart3,
  CreditCard, FileText, MapPin, ShoppingCart, Menu, X, Palette,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const dashboardItem: NavItem = { href: "/dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" /> };
const eventsItem: NavItem = { href: "/dashboard/events", label: "My Events", icon: <Calendar className="h-4 w-4" /> };
const searchItem: NavItem = { href: "/search", label: "Find Services", icon: <Search className="h-4 w-4" /> };
const cartItem: NavItem = { href: "/dashboard/cart", label: "Cart", icon: <ShoppingCart className="h-4 w-4" /> };
const bookingsItem: NavItem = { href: "/dashboard/bookings", label: "Bookings", icon: <Package className="h-4 w-4" /> };
const documentsItem: NavItem = { href: "/dashboard/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> };
const messagesItem: NavItem = { href: "/dashboard/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> };

const customerGroups: NavGroup[] = [
  { label: "Overview", items: [dashboardItem] },
  { label: "Planning", items: [eventsItem, searchItem, cartItem] },
  { label: "Activity", items: [bookingsItem, documentsItem, messagesItem] },
];

const providerDashboardItem: NavItem = { href: "/provider", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> };
const providerBookingsItem: NavItem = { href: "/provider/bookings", label: "Bookings", icon: <Package className="h-4 w-4" /> };
const providerCalendarItem: NavItem = { href: "/provider/calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> };
const providerMessagesItem: NavItem = { href: "/provider/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> };
const providerServicesItem: NavItem = { href: "/provider/services", label: "Services", icon: <Building2 className="h-4 w-4" /> };
const providerEquipmentItem: NavItem = { href: "/provider/equipment", label: "Equipment", icon: <Music className="h-4 w-4" /> };
const providerDocumentsItem: NavItem = { href: "/provider/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> };
const providerReviewsItem: NavItem = { href: "/provider/reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> };
const providerSyncItem: NavItem = { href: "/provider/local-sync", label: "Local Sync", icon: <RefreshCw className="h-4 w-4" /> };
const providerSubscriptionItem: NavItem = { href: "/provider/subscription", label: "Subscription", icon: <CreditCard className="h-4 w-4" /> };
const providerSettingsItem: NavItem = { href: "/provider/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> };

const providerGroups: NavGroup[] = [
  { label: "Overview", items: [providerDashboardItem] },
  { label: "Bookings & Chat", items: [providerBookingsItem, providerCalendarItem, providerMessagesItem] },
  { label: "Inventory", items: [providerServicesItem, providerEquipmentItem] },
  { label: "Business", items: [providerDocumentsItem, providerReviewsItem, providerSyncItem, providerSubscriptionItem, providerSettingsItem] },
];

const adminOverviewItem: NavItem = { href: "/admin", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> };
const adminUsersItem: NavItem = { href: "/admin/users", label: "Users", icon: <User className="h-4 w-4" /> };
const adminProvidersItem: NavItem = { href: "/admin/providers", label: "Providers", icon: <Building2 className="h-4 w-4" /> };
const adminComplaintsItem: NavItem = { href: "/admin/complaints", label: "Complaints", icon: <MessageSquare className="h-4 w-4" /> };
const adminLocationsItem: NavItem = { href: "/admin/locations", label: "Locations", icon: <MapPin className="h-4 w-4" /> };
const adminSubscriptionsItem: NavItem = { href: "/admin/subscription-plans", label: "Subscriptions", icon: <CreditCard className="h-4 w-4" /> };
const adminBrandingItem: NavItem = { href: "/admin/branding", label: "Branding", icon: <Palette className="h-4 w-4" /> };
const adminPaymentsItem: NavItem = { href: "/admin/payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> };

const adminGroups: NavGroup[] = [
  { label: "Overview", items: [adminOverviewItem] },
  { label: "People", items: [adminUsersItem, adminProvidersItem, adminComplaintsItem] },
  { label: "Platform", items: [adminLocationsItem, adminSubscriptionsItem, adminBrandingItem, adminPaymentsItem] },
];

const groupByRole: Record<"CUSTOMER" | "PROVIDER" | "ADMIN", NavGroup[]> = {
  CUSTOMER: customerGroups,
  PROVIDER: providerGroups,
  ADMIN: adminGroups,
};

export function Sidebar({ role }: { role: "CUSTOMER" | "PROVIDER" | "ADMIN" }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = groupByRole[role];
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navBody = (
    <nav className="flex-1 space-y-6 overflow-y-auto p-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
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
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 md:hidden">
        <Link href="/">
          <EventicateLogo className="h-7" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex">
        <div className="border-b border-gray-200 p-6 dark:border-gray-800">
          <Link href="/">
            <EventicateLogo className="h-8" />
          </Link>
          <p className="text-xs text-gray-500 capitalize dark:text-gray-400">{role.toLowerCase()} Portal</p>
        </div>
        {navBody}
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          <ThemeToggle className="w-full" />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
              <EventicateLogo className="h-7" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navBody}
            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <ThemeToggle className="w-full" />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const leftLinks = (
    <>
      <Link href="/search" className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
        Find Services
      </Link>
      <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
        How It Works
      </Link>
    </>
  );

  const rightLinks = (
    <>
      <Link href="/auth/login" className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400">
        Sign In
      </Link>
      <Link
        href="/auth/register"
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        Get Started
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex flex-1 items-center gap-6">
          <nav className="hidden items-center gap-6 md:flex">{leftLinks}</nav>
        </div>

        <Link href="/" aria-label="Eventicate home" className="shrink-0">
          <BrandLogo markClassName="h-9 w-9" />
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3">
          <nav className="hidden items-center gap-6 md:flex">{rightLinks}</nav>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="flex flex-col gap-4 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950 md:hidden">
          {leftLinks}
          <div className="flex flex-col gap-4">{rightLinks}</div>
        </nav>
      )}
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
