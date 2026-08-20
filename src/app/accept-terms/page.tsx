import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PublicHeader } from "@/components/layout/Navigation";
import { Card } from "@/components/ui/Card";
import { ShieldCheck } from "lucide-react";
import { PROVIDER_TERMS, CUSTOMER_TERMS } from "@/lib/terms";
import { AcceptTermsButtons } from "./AcceptTermsButtons";

export default async function AcceptTermsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const isProvider = session.role === "PROVIDER";
  const home = isProvider ? "/provider" : session.role === "ADMIN" ? "/admin" : "/dashboard";
  const terms = isProvider ? PROVIDER_TERMS : CUSTOMER_TERMS;

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-950">
      <PublicHeader />
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12">
        <Card className="w-full">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">
              Terms of Use
            </h1>
          </div>
          <p className="mb-6 text-sm text-charcoal-600 dark:text-charcoal-300">
            Welcome{isProvider ? `, ${session.firstName}` : ""}! Before you start using Eventicate, please
            read and accept our {isProvider ? "provider" : "customer"} terms below.
          </p>

          <ol className="mb-6 list-decimal space-y-3 pl-5 text-sm text-charcoal-700 dark:text-charcoal-200">
            {terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>

          <AcceptTermsButtons home={home} />
        </Card>
      </div>
    </div>
  );
}