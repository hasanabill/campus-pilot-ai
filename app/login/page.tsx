"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";

type DemoRole = "student" | "faculty" | "admin" | "registrar";

const DEMO_CREDENTIALS: Record<DemoRole, { email: string; password: string }> = {
  student:   { email: "student@campus.com",   password: "student123" },
  faculty:   { email: "faculty@campus.com",   password: "faculty123" },
  admin:     { email: "admin@campus.com",     password: "admin123" },
  registrar: { email: "registrar@campus.com", password: "registrar123" },
};

const demoPills: Record<DemoRole, string> = {
  student:   "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  faculty:   "border-sky-200    bg-sky-50    text-sky-700    hover:bg-sky-100",
  admin:     "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  registrar: "border-amber-200  bg-amber-50  text-amber-700  hover:bg-amber-100",
};

export default function LoginPage() {
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [error, setError]                   = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [activeDemoRole, setActiveDemoRole] = useState<DemoRole | null>(null);

  async function loginWithCredentials(targetEmail: string, targetPassword: string) {
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email: targetEmail,
      password: targetPassword,
      redirect: false,
    });

    setLoading(false);
    setActiveDemoRole(null);

    if (!result || result.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    window.location.assign("/dashboard");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loginWithCredentials(email, password);
  }

  async function onDemoSignIn(role: DemoRole) {
    const creds = DEMO_CREDENTIALS[role];
    if (!creds.email || !creds.password) {
      setError(`Set ${role} demo credentials in DEMO_CREDENTIALS first.`);
      return;
    }
    setActiveDemoRole(role);
    setEmail(creds.email);
    setPassword(creds.password);
    await loginWithCredentials(creds.email, creds.password);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Brand */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold text-sm">CP</span>
            <span className="text-lg font-bold text-zinc-900">CampusPilot AI</span>
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your department account.</p>
        </div>

        {/* Form card */}
        <form onSubmit={onSubmit} className="cp-card space-y-4">
          <div>
            <label htmlFor="login-email" className="cp-label">Email address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@university.edu"
              className="cp-input"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="cp-label">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="cp-input"
            />
          </div>

          {error ? <InlineAlert tone="error" message={error} /> : null}

          <button
            type="submit"
            disabled={loading}
            className="cp-btn-primary w-full py-2.5"
          >
            {loading && !activeDemoRole ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Demo sign-in */}
        <div className="cp-card space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Demo sign-in — pick a role
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["student", "faculty", "admin", "registrar"] as const).map((role) => (
              <button
                key={role}
                type="button"
                disabled={loading}
                onClick={() => void onDemoSignIn(role)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition disabled:opacity-50 ${demoPills[role]}`}
              >
                {activeDemoRole === role && loading
                  ? "Signing in…"
                  : role}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Don&apos;t have an account?{" "}
          <span className="text-zinc-500">Contact your department administrator.</span>
        </p>
      </div>
    </main>
  );
}
