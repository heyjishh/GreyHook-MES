"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("admin@sunrise.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const IS_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
    if (IS_MOCK) {
      const mockToken = "mock-token-demo";
      sessionStorage.setItem("auth_token", mockToken);
      login(mockToken, {
        id: "mock",
        organization_id: "mock-org",
        email,
        name: "Demo User",
        role: "admin",
        is_active: true,
        created_at: new Date().toISOString(),
      });
      router.push("/dashboard");
      return;
    }
    try {
      const res = await authApi.login(email, password);
      login(res.access_token, res.user);
      router.push("/dashboard");
    } catch {
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-bg flex">

      {/* Dark stat sidebar */}
      <div className="hidden lg:flex w-80 shrink-0 flex-col justify-between bg-sidebar-bg border-r border-sidebar-border px-10 py-10">
        <div>
          <div className="w-5 h-5 rounded-sm bg-brand mb-12" />
          <p className="font-mono text-2xs text-sidebar-fg-muted uppercase tracking-widest mb-10">
            Factory Intelligence OS
          </p>
          <div className="space-y-8">
            {[
              { label: "Availability", value: "94.2%" },
              { label: "OEE Score",    value: "78.4%" },
              { label: "Machines",     value: "4" },
            ].map(({ label, value }) => (
              <div key={label} className="border-l border-sidebar-border pl-5">
                <p className="font-mono text-2xs text-sidebar-fg-muted uppercase tracking-widest mb-1">{label}</p>
                <p className="font-mono text-4xl font-black text-sidebar-fg leading-none">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-2xs uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.18)" }}>
          Sunrise Plant 1
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-sm bg-brand" />
              <span className="font-mono text-2xs text-text-tertiary uppercase tracking-widest">
                MES Platform
              </span>
            </div>
            <h1 className="font-sans text-2xl font-black text-text-primary tracking-tight leading-none">
              Sign in to GreyHook
            </h1>
            <p className="font-sans text-sm text-text-secondary mt-2">
              Enter your credentials to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-2xs text-text-secondary uppercase tracking-widest mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border rounded bg-bg px-3 py-2.5 text-sm font-sans text-text-primary placeholder-text-disabled focus:outline-none focus:border-brand focus:shadow-ring transition-all"
                placeholder="supervisor@factory.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-mono text-2xs text-text-secondary uppercase tracking-widest mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded bg-bg px-3 py-2.5 text-sm font-sans text-text-primary placeholder-text-disabled focus:outline-none focus:border-brand focus:shadow-ring transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-danger-subtle border border-danger/20 rounded px-3 py-2">
                <p className="font-mono text-xs text-danger">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-brand-fg font-mono text-xs font-bold py-3 rounded uppercase tracking-widest hover:bg-brand-hover active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-10 font-mono text-2xs text-text-disabled text-center uppercase tracking-widest">
            GreyHook MES · Secure Access
          </p>
        </div>
      </div>
    </main>
  );
}
