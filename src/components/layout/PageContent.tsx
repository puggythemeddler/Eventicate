import { TopBar } from "./TopBar";

export function PageContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1">
      <TopBar />
      <div className="p-8">{children}</div>
    </main>
  );
}
