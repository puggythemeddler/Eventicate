"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unreadCount ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 60000);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?take=10");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await loadNotifications();
  };

  const handleClick = async (n: AppNotification) => {
    if (!n.isRead) {
      fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setUnreadCount(0);
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications (${unreadCount} unread)`}
        className="relative rounded-lg p-2 text-charcoal-600 hover:bg-sand dark:text-charcoal-300 dark:hover:bg-charcoal-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-lg dark:border-charcoal-700 dark:bg-charcoal-900">
          <div className="flex items-center justify-between border-b border-charcoal-100 px-4 py-3 dark:border-charcoal-800">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
              >
                Mark all read
              </button>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-charcoal-500 hover:bg-sand dark:text-charcoal-400 dark:hover:bg-charcoal-800"
              >
                View all
              </Link>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-charcoal-400 dark:text-charcoal-500">Loading...</p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-charcoal-400 dark:text-charcoal-500">
                <Inbox className="h-8 w-8" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-charcoal-50 px-4 py-3 text-left hover:bg-sand dark:border-charcoal-800 dark:hover:bg-charcoal-800/60",
                    !n.isRead && "bg-primary-50/60 dark:bg-primary-900/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="shrink-0 text-[11px] text-charcoal-400 dark:text-charcoal-500">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-charcoal-500 dark:text-charcoal-400">{n.message}</p>
                </button>
              ))
            )}
          </div>

          {unreadCount > 0 && (
            <div className="flex items-center gap-1 border-t border-charcoal-100 px-4 py-2 text-xs text-charcoal-500 dark:border-charcoal-800 dark:text-charcoal-400">
              <CheckCheck className="h-3.5 w-3.5" />
              {unreadCount} unread
            </div>
          )}
        </div>
      )}
    </div>
  );
}