import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { initTheme } from "@/lib/theme-config";

export const metadata: Metadata = {
  title: "Eventicate — Event Management Marketplace",
  description: "Plan and organize events by booking all required services from verified providers in one platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(${initTheme.toString()})()` }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
