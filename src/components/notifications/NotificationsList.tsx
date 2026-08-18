"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

export function NotificationsList() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications?take=50");
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (n: AppNotification) => {
    if (n.isRead) {
      if (n.link) router.push(n.link);
      return;
    }
    await fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => {});
    setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setNotifications((ns) => ns.map((x) => ({ ...x, isRead: true })));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-gray-500 dark:text-gray-400">Updates about your bookings, payments and messages</p>
        </div>
        <Button variant="outline" onClick={markAllRead}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>}

      {loading ? (
        <p className="p-8 text-center text-sm text-gray-400">Loading...</p>
      ) : notifications.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-gray-400">
          <Inbox className="h-10 w-10" />
          <p className="text-sm">No notifications yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n)}
              className={cn(
                "flex w-full items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/60",
                !n.isRead && "border-primary-200 bg-primary-50/60 dark:border-primary-800 dark:bg-primary-900/20"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-600" />}
                </div>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{n.message}</p>
              </div>
              <span className="shrink-0 text-xs text-gray-400">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}