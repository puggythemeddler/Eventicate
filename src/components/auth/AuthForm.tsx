"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SERVICE_CATEGORIES } from "@/lib/constants";

interface AuthFormProps {
  mode: "login" | "register";
  defaultRole?: string;
  googleError?: string;
}

const GOOGLE_ERRORS: Record<string, string> = {
  google_auth_failed: "Google sign-in failed. Please try again.",
  no_email: "Google account has no email. Please use a different account.",
  account_deactivated: "This account has been deactivated.",
};

export function AuthForm({ mode, defaultRole = "customer", googleError }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: defaultRole === "provider" ? "PROVIDER" : "CUSTOMER",
    businessName: "",
    category: "OTHER",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const displayError = error || (googleError ? GOOGLE_ERRORS[googleError] || "Authentication failed" : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister
      ? form
      : { email: form.email, password: form.password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Authentication failed");

      const role = data.user.role;
      if (role === "ADMIN") router.push("/admin");
      else if (role === "PROVIDER") router.push("/provider");
      else router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PublicHeader />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Card className="w-full">
          <h1 className="mb-2 text-2xl font-bold">
            {isRegister ? "Create Account" : "Sign In"}
          </h1>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {isRegister
              ? "Join Eventicate to plan events or list your services"
              : "Welcome back to Eventicate"}
          </p>

          {displayError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{displayError}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
                <Select
                  label="Account Type"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  options={[
                    { value: "CUSTOMER", label: "Customer / Event Organizer" },
                    { value: "PROVIDER", label: "Service Provider" },
                  ]}
                />
                {form.role === "PROVIDER" && (
                  <>
                    <Input
                      label="Business Name"
                      value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      required
                    />
                    <Select
                      label="Service Category"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      options={SERVICE_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      }))}
                    />
                  </>
                )}
              </>
            )}
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          {!isRegister && (
            <>
              <div className="my-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400">OR</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              </div>
              <a
                href="/api/auth/google"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </a>
            </>
          )}
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link
              href={isRegister ? "/auth/login" : "/auth/register"}
              className="text-primary-600 hover:underline"
            >
              {isRegister ? "Sign In" : "Register"}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
