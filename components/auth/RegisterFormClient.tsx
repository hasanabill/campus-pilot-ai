"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";

const roles = ["student", "faculty", "admin", "registrar"] as const;
const roleHelpText: Record<(typeof roles)[number], string> = {
  student: "Student: can submit/track requests, view schedules, and use chat assistant.",
  faculty: "Faculty: can manage ticket workflow, review schedules, and view reports.",
  admin: "Admin: can manage schedules/tickets, provision users, and run operations.",
  registrar: "Registrar: can access reporting and approval-oriented workflows.",
};

export default function RegisterFormClient() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof roles)[number]>("student");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    if (!email.includes("@")) {
      setFieldErrors({ email: "Enter a valid email address." });
      return;
    }
    if (password.length < 8) {
      setFieldErrors({ password: "Password must be at least 8 characters." });
      return;
    }

    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        department_id: departmentId || null,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (response.status === 409) {
        setError("An account with this email already exists.");
      } else {
        setError(payload?.error ?? "Account creation failed.");
      }
      return;
    }

    const createdEmail = email;
    const createdRole = role;
    setName("");
    setEmail("");
    setPassword("");
    setRole("student");
    setDepartmentId("");
    setSuccess(`Account created successfully for ${createdEmail} (${createdRole}).`);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-black shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-zinc-900">Create user account</h1>
        <p className="text-sm text-zinc-600">
          Admin-only account provisioning for student, faculty, admin, and registrar roles.
        </p>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`w-full rounded-md border px-3 py-2 outline-none focus:border-zinc-500 ${
              fieldErrors.email ? "border-red-300" : "border-zinc-300"
            }`}
          />
          {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Password</span>
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`w-full rounded-md border px-3 py-2 outline-none focus:border-zinc-500 ${
              fieldErrors.password ? "border-red-300" : "border-zinc-300"
            }`}
          />
          <div className="mt-1 flex items-center justify-between">
            {fieldErrors.password ? (
              <p className="text-xs text-red-600">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-zinc-500">Use a temporary password and share securely.</p>
            )}
            <p className="text-xs text-zinc-500">{password.length}/8 min</p>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof roles)[number])}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-500"
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">{roleHelpText[role]}</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Department ID (optional)</span>
          <input
            type="text"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
          />
        </label>

        {error ? <InlineAlert tone="error" message={error} /> : null}
        {success ? <InlineAlert tone="success" message={success} /> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <Link href="/dashboard" className="text-zinc-600 underline hover:text-zinc-900">
            Back to dashboard
          </Link>
          <span className="text-zinc-500">Admin only</span>
        </div>
      </form>
    </main>
  );
}
