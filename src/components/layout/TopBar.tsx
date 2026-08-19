"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function TopBar() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-end border-b border-charcoal-200 bg-white px-6 py-3 dark:border-charcoal-800 dark:bg-charcoal-900">
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-charcoal-600 transition-colors hover:bg-sand hover:text-terracotta-600 dark:text-charcoal-300 dark:hover:bg-charcoal-800 dark:hover:text-terracotta-400"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
