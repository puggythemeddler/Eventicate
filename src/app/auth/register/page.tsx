import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

function RegisterContent({ role }: { role?: string }) {
  return <AuthForm mode="register" defaultRole={role} />;
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  return (
    <Suspense>
      <RegisterPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterPageInner({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  return <RegisterContent role={params.role} />;
}
