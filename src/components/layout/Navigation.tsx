"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EventicateLogo } from "@/components/ui/EventicateLogo";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  Calendar, Home, MessageSquare, Search, Star, User,
  LayoutDashboard, Package, Settings, Truck, Music,
  Camera, UtensilsCrossed, Building2, RefreshCw, BarChart3,
  CreditCard, FileText, MapPin, ShoppingCart, Menu, X, Palette,
  MessageCircle, Layers, MessageSquareWarning, Plus, ClipboardList,
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
const complaintsItem: NavItem = { href: "/dashboard/complaints", label: "Complaints", icon: <MessageSquareWarning className="h-4 w-4" /> };

const customerGroups: NavGroup[] = [
  { label: "Overview", items: [dashboardItem] },
  { label: "Planning", items: [eventsItem, searchItem, cartItem] },
  { label: "Activity", items: [bookingsItem, documentsItem, messagesItem, complaintsItem] },
];

const providerDashboardItem: NavItem = { href: "/provider", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> };
const providerBookingsItem: NavItem = { href: "/provider/bookings", label: "Bookings", icon: <Package className="h-4 w-4" /> };
const providerCalendarItem: NavItem = { href: "/provider/calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> };
const providerMessagesItem: NavItem = { href: "/provider/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> };
const providerServicesItem: NavItem = { href: "/provider/services", label: "Services", icon: <Building2 className="h-4 w-4" /> };
const providerEquipmentItem: NavItem = { href: "/provider/equipment", label: "Equipment", icon: <Music className="h-4 w-4" /> };
const providerListingsItem: NavItem = { href: "/provider/listings", label: "Venues & Packages", icon: <Layers className="h-4 w-4" /> };
const providerDocumentsItem: NavItem = { href: "/provider/documents", label: "Documents", icon: <FileText className="h-4 w-4" /> };
const providerReviewsItem: NavItem = { href: "/provider/reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> };
const providerSyncItem: NavItem = { href: "/provider/local-sync", label: "Local Sync", icon: <RefreshCw className="h-4 w-4" /> };
const providerSubscriptionItem: NavItem = { href: "/provider/subscription", label: "Subscription", icon: <CreditCard className="h-4 w-4" /> };
const providerAnalyticsItem: NavItem = { href: "/provider/analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> };
const providerSettingsItem: NavItem = { href: "/provider/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> };

const providerGroups: NavGroup[] = [
  { label: "Overview", items: [providerDashboardItem] },
  { label: "Bookings & Chat", items: [providerBookingsItem, providerCalendarItem, providerMessagesItem] },
  { label: "Inventory", items: [providerServicesItem, providerEquipmentItem, providerListingsItem] },
  { label: "Business", items: [providerDocumentsItem, providerReviewsItem, providerSyncItem, providerSubscriptionItem, providerAnalyticsItem, complaintsItem, providerSettingsItem] },
];

const adminOverviewItem: NavItem = { href: "/admin", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> };
const adminUsersItem: NavItem = { href: "/admin/users", label: "Users", icon: <User className="h-4 w-4" /> };
const adminProvidersItem: NavItem = { href: "/admin/providers", label: "Providers", icon: <Building2 className="h-4 w-4" /> };
const adminComplaintsItem: NavItem = { href: "/admin/complaints", label: "Complaints", icon: <MessageSquare className="h-4 w-4" /> };
const adminLocationsItem: NavItem = { href: "/admin/locations", label: "Locations", icon: <MapPin className="h-4 w-4" /> };
const adminSubscriptionsItem: NavItem = { href: "/admin/subscription-plans", label: "Subscriptions", icon: <CreditCard className="h-4 w-4" /> };
const adminBrandingItem: NavItem = { href: "/admin/branding", label: "Branding", icon: <Palette className="h-4 w-4" /> };
const adminPaymentsItem: NavItem = { href: "/admin/payments", label: "Payments", icon: <CreditCard className="h-4 w-4" /> };
const adminWhatsAppItem: NavItem = { href: "/admin/whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> };
const adminReportsItem: NavItem = { href: "/admin/reports", label: "Reports", icon: <ClipboardList className="h-4 w-4" /> };

const adminGroups: NavGroup[] = [
  { label: "Overview", items: [adminOverviewItem] },
  { label: "People", items: [adminUsersItem, adminProvidersItem, adminComplaintsItem] },
  { label: "Platform", items: [adminLocationsItem, adminSubscriptionsItem, adminBrandingItem, adminPaymentsItem, adminWhatsAppItem, adminReportsItem] },
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
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
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
                    ? "bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200"
                    : "text-charcoal-600 hover:bg-sand hover:text-charcoal-900 dark:text-charcoal-300 dark:hover:bg-charcoal-800 dark:hover:text-charcoal-100"
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
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-charcoal-200 bg-white px-4 py-3 dark:border-charcoal-800 dark:bg-charcoal-900 md:hidden">
        <Link href="/">
          <EventicateLogo className="h-7" />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-charcoal-200 p-2 text-charcoal-600 hover:bg-sand dark:border-charcoal-700 dark:text-charcoal-300 dark:hover:bg-charcoal-800"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-charcoal-200 bg-white dark:border-charcoal-800 dark:bg-charcoal-900 md:flex">
        <div className="border-b border-charcoal-200 p-6 dark:border-charcoal-800">
          <Link href="/">
            <EventicateLogo className="h-8" />
          </Link>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-charcoal-500 capitalize dark:text-charcoal-400">{role.toLowerCase()} Portal</p>
            <NotificationBell />
          </div>
        </div>
        {navBody}
        <div className="border-t border-charcoal-200 p-4 dark:border-charcoal-800">
          <ThemeToggle className="w-full" />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-charcoal-950/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-charcoal-200 bg-white shadow-xl dark:border-charcoal-800 dark:bg-charcoal-900">
            <div className="flex items-center justify-between border-b border-charcoal-200 p-4 dark:border-charcoal-800">
              <EventicateLogo className="h-7" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-charcoal-500 hover:bg-sand dark:hover:bg-charcoal-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navBody}
            <div className="border-t border-charcoal-200 p-4 dark:border-charcoal-800">
              <ThemeToggle className="w-full" />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

const MARKET_LINKS = [
  { href: "/search", label: "Explore" },
  { href: "/search?category=VENUE", label: "Venues" },
  { href: "/search?category=CATERING", label: "Catering" },
  { href: "/search?category=TENTS", label: "Rentals" },
];

interface PublicSession {
  user: { id: string; role: "CUSTOMER" | "PROVIDER" | "ADMIN"; firstName: string } | null;
}

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<PublicSession["user"] | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data: PublicSession) => setSession(data.user))
      .catch(() => setSession(null));
  }, []);

  const dashboardHref = session
    ? session.role === "ADMIN"
      ? "/admin"
      : session.role === "PROVIDER"
      ? "/provider"
      : "/dashboard"
    : "/auth/login";

  const navLinks = (
    <nav className="hidden items-center gap-6 lg:flex" aria-label="Marketplace">
      {MARKET_LINKS.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="text-sm font-medium text-charcoal-200 transition-colors hover:text-gold-300"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );

  const actions = (
    <div className="flex items-center gap-3">
      <Link
        href="/search"
        aria-label="Search the marketplace"
        className="rounded-lg border border-charcoal-700 p-2 text-charcoal-200 transition-colors hover:border-gold-500 hover:text-gold-300"
      >
        <Search className="h-4 w-4" />
      </Link>
      <span className="hidden sm:inline-flex items-center gap-3">
        <Link
          href="/auth/register?role=provider"
          className="text-sm font-medium text-charcoal-200 transition-colors hover:text-gold-300"
        >
          List Your Business
        </Link>
        <Link
          href={session ? dashboardHref : "/auth/login"}
          className="text-sm font-medium text-charcoal-200 transition-colors hover:text-gold-300"
        >
          {session ? "Dashboard" : "Sign In"}
        </Link>
      </span>
      <Link
        href={session ? "/dashboard/events/new" : "/auth/register"}
        className="hidden items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-charcoal-950 transition-colors hover:bg-gold-400 sm:inline-flex"
      >
        <Plus className="h-4 w-4" />
        Create an Event
      </Link>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
        className="rounded-lg border border-charcoal-700 p-2 text-charcoal-200 hover:border-gold-500 hover:text-gold-300 lg:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-charcoal-800 bg-charcoal-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex flex-1 items-center gap-8">
          <Link href="/" aria-label="Eventicate home" className="shrink-0">
            <BrandLogo tone="light" markClassName="h-9 w-9" />
          </Link>
          {navLinks}
        </div>
        <div className="flex items-center justify-end gap-3">
          {actions}
        </div>
      </div>
      {mobileOpen && (
        <nav className="border-t border-charcoal-800 bg-charcoal-950 px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {MARKET_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-charcoal-200 hover:bg-charcoal-900 hover:text-gold-300"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-charcoal-800" />
            <Link
              href="/auth/register?role=provider"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-charcoal-200 hover:bg-charcoal-900 hover:text-gold-300"
            >
              List Your Business
            </Link>
            <Link
              href={session ? dashboardHref : "/auth/login"}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-charcoal-200 hover:bg-charcoal-900 hover:text-gold-300"
            >
              {session ? "Dashboard" : "Sign In"}
            </Link>
            <Link
              href={session ? "/dashboard/events/new" : "/auth/register"}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-charcoal-950"
            >
              <Plus className="h-4 w-4" />
              Create an Event
            </Link>
          </div>
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
    TENTS: <Layers className="h-5 w-5" />,
    DECORATION: <Palette className="h-5 w-5" />,
    ENTERTAINMENT: <Star className="h-5 w-5" />,
  };
  return icons[category] || <Package className="h-5 w-5" />;
}