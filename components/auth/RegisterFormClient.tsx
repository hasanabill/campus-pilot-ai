"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";

const roles = ["student", "faculty", "admin", "registrar"] as const;
const roleHelp: Record<(typeof roles)[number], string> = {
  student:   "Can submit/track requests, view schedules, and use the AI chat assistant.",
  faculty:   "Can manage ticket workflow, review schedules, and view reports.",
  admin:     "Full access: manage schedules/tickets, provision users, run operations.",
  registrar: "Access to reporting and approval-oriented workflows.",
};

const rolePillStyle: Record<(typeof roles)[number], string> = {
  student:   "border-emerald-200 text-emerald-700",
  faculty:   "border-sky-200    text-sky-700",
  admin:     "border-violet-200 text-violet-700",
  registrar: "border-amber-200  text-amber-700",
};

export default function RegisterFormClient() {
  const router = useRouter();

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [role,         setRole]         = useState<(typeof roles)[number]>("student");
  const [departmentId, setDepartmentId] = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [fieldErrors,  setFieldErrors]  = useState<{ email?: string; password?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const fe: typeof fieldErrors = {};
    if (!email.includes("@")) fe.email = "Enter a valid email address.";
    if (password.length < 8)  fe.password = "Password must be at least 8 characters.";
    if (Object.keys(fe).length) { setFieldErrors(fe); return; }

    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, department_id: departmentId || null }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(response.status === 409 ? "An account with this email already exists." : (payload?.error ?? "Account creation failed."));
      return;
    }

    const createdEmail = email;
    const createdRole  = role;
    setName(""); setEmail(""); setPassword(""); setRole("student"); setDepartmentId("");
    setSuccess(`Account created for ${createdEmail} (${createdRole}).`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">

      {/* Header */}
      <div>
        <Link href="/dashboard" className="cp-btn-ghost text-xs px-0 mb-4 inline-flex items-center gap-1">
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Create user account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Admin-only provisioning. Fill out the form to add a new team member.
        </p>
      </div>

      <form onSubmit={onSubmit} className="cp-card space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="reg-name" className="cp-label">Full name</label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Jane Smith"
            className="cp-input"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="cp-label">Email address</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jane@university.edu"
            className={`cp-input ${fieldErrors.email ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {fieldErrors.email ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
          ) : null}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="cp-label">Temporary password</label>
          <input
            id="reg-password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Min. 8 characters"
            className={`cp-input ${fieldErrors.password ? "border-red-300 focus:border-red-400" : ""}`}
          />
          <div className="mt-1 flex items-center justify-between">
            {fieldErrors.password ? (
              <p className="text-xs text-red-600">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-zinc-400">Share securely — user should reset on first login.</p>
            )}
            <p className="text-xs text-zinc-400">{password.length} / 8 min</p>
          </div>
        </div>

        {/* Role */}
        <div>
          <label htmlFor="reg-role" className="cp-label">Role</label>
          <select
            id="reg-role"
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof roles)[number])}
            className="cp-select"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
          <p className={`mt-1.5 flex items-start gap-1.5 rounded-lg border px-3 py-2 text-xs ${rolePillStyle[role]} bg-white`}>
            <span className="shrink-0 font-semibold capitalize">{role}:</span>
            <span className="text-zinc-500">{roleHelp[role]}</span>
          </p>
        </div>

        {/* Department ID */}
        <div>
          <label htmlFor="reg-dept" className="cp-label">Department ID <span className="font-normal text-zinc-400">(optional)</span></label>
          <input
            id="reg-dept"
            type="text"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder="Leave blank if not applicable"
            className="cp-input"
          />
        </div>

        {error   ? <InlineAlert tone="error"   message={error}   /> : null}
        {success ? <InlineAlert tone="success" message={success} /> : null}

        <button
          type="submit"
          disabled={loading}
          className="cp-btn-primary w-full py-2.5"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <p className="text-center text-xs text-zinc-400">Admin-only · Actions are audit-logged.</p>
      </form>
    </div>
  );
}
