"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";

type DemoRole = "student" | "faculty" | "admin" | "registrar";

// Demo credentials (edit these values as needed).
const DEMO_CREDENTIALS: Record<DemoRole, { email: string; password: string }> =
  {
    student: { email: "student@campus.com", password: "student123" },
    faculty: { email: "faculty@campus.com", password: "faculty123" },
    admin: { email: "admin@campus.com", password: "admin123" },
    registrar: { email: "registrar@campus.com", password: "registrar123" },
  };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDemoRole, setActiveDemoRole] = useState<DemoRole | null>(null);

  async function loginWithCredentials(
    targetEmail: string,
    targetPassword: string
  ) {
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
      setError("Invalid email or password.");
      return;
    }

    // Force a full navigation so auth-aware server layout/sidebar
    // gets the fresh session immediately after login.
    window.location.assign("/dashboard");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loginWithCredentials(email, password);
  }

  async function onDemoSignIn(role: DemoRole) {
    const credentials = DEMO_CREDENTIALS[role];
    if (!credentials.email || !credentials.password) {
      setError(`Set ${role} demo credentials in DEMO_CREDENTIALS first.`);
      return;
    }

    setActiveDemoRole(role);
    setEmail(credentials.email);
    setPassword(credentials.password);
    await loginWithCredentials(credentials.email, credentials.password);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
        <p className="text-sm text-zinc-900">Access CampusPilot AI</p>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-900">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-900">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
          />
        </label>

        {error ? <InlineAlert tone="error" message={error} /> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-900">Demo Sign In</p>
          <div className="grid grid-cols-2 gap-2">
            {(["student", "faculty", "admin", "registrar"] as const).map(
              (role) => (
                <button
                  key={role}
                  type="button"
                  disabled={loading}
                  onClick={() => void onDemoSignIn(role)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
                >
                  {activeDemoRole === role && loading
                    ? `Signing ${role}...`
                    : `${role[0].toUpperCase()}${role.slice(1)}`}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-zinc-900">
          <p>Need an account? Contact your department administrator.</p>
          <Link href="/" className="underline hover:text-zinc-900">
            Back home
          </Link>
        </div>
      </form>
    </main>
  );
}
