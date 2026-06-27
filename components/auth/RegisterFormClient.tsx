"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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

type DepartmentOption = {
  _id: string;
  name?: string;
  code?: string;
};

export default function RegisterFormClient() {
  const router = useRouter();

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [role,         setRole]         = useState<(typeof roles)[number]>("student");
  const [publicUserId, setPublicUserId] = useState("");
  const [studentId,    setStudentId]    = useState("");
  const [program,      setProgram]      = useState("");
  const [semester,     setSemester]     = useState(1);
  const [batch,        setBatch]        = useState("");
  const [employeeId,   setEmployeeId]   = useState("");
  const [designation,  setDesignation]  = useState("");
  const [specialization, setSpecialization] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments,  setDepartments]  = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [fieldErrors,  setFieldErrors]  = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      setDepartmentsLoading(true);
      try {
        const res = await fetch("/api/master-data/departments?limit=100");
        const payload = (await res.json()) as { items?: DepartmentOption[]; error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Failed to load departments.");
        if (active) {
          setDepartments(payload.items ?? []);
          setDepartmentId((prev) => prev || payload.items?.[0]?._id || "");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load departments.");
      } finally {
        if (active) setDepartmentsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

    const body = {
      name,
      email,
      password,
      role,
      public_user_id: publicUserId || null,
      department_id: departmentId || null,
      ...(role === "student"
        ? {
            student_id: studentId,
            program,
            semester,
            batch,
          }
        : {}),
      ...(role === "faculty"
        ? {
            employee_id: employeeId,
            designation,
            specialization: specialization || null,
          }
        : {}),
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? (response.status === 409 ? "An account with this email already exists." : "Account creation failed."));
      return;
    }

    const createdEmail = email;
    const createdRole  = role;
    setName("");
    setEmail("");
    setPassword("");
    setRole("student");
    setPublicUserId("");
    setStudentId("");
    setProgram("");
    setSemester(1);
    setBatch("");
    setEmployeeId("");
    setDesignation("");
    setSpecialization("");
    setDepartmentId(departments[0]?._id ?? "");
    setSuccess(
      `Account created for ${createdEmail} (${createdRole})${publicUserId ? ` with user ID ${publicUserId.toUpperCase()}` : ""}.`,
    );
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

        <div>
          <label htmlFor="reg-user-id" className="cp-label">
            Login/Public ID <span className="font-normal text-zinc-400">(optional, unique)</span>
          </label>
          <input
            id="reg-user-id"
            type="text"
            value={publicUserId}
            onChange={(e) => setPublicUserId(e.target.value)}
            placeholder="LOGIN-STU-2401, LOGIN-FAC-001, REG-01"
            className="cp-input"
          />
          <p className="mt-1 text-xs text-zinc-500">
            This is the visible login/user identifier. Student ID and Faculty ID are stored separately in profile fields below.
          </p>
        </div>

        <div>
          <label htmlFor="reg-dept" className="cp-label">
            Department {(role === "student" || role === "faculty") ? <span className="text-red-600">*</span> : <span className="font-normal text-zinc-400">(optional)</span>}
          </label>
          <select
            id="reg-dept"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="cp-select"
            required={role === "student" || role === "faculty"}
            disabled={departmentsLoading}
          >
            <option value="">{departmentsLoading ? "Loading departments..." : "Select department"}</option>
            {departments.map((department) => (
              <option key={department._id} value={department._id}>
                {department.code ? `${department.code} - ` : ""}{department.name ?? department._id}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Departments are loaded from Master Data. Create the department there first if it is missing.
          </p>
        </div>

        {role === "student" ? (
          <div className="cp-card-2 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Student profile</p>
            <div>
              <label htmlFor="reg-student-id" className="cp-label">Student ID <span className="text-red-600">*</span></label>
              <input
                id="reg-student-id"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="2026-001 / CIS-15-001"
                className="cp-input"
                required
              />
            </div>
            <div>
              <label htmlFor="reg-program" className="cp-label">Program <span className="text-red-600">*</span></label>
              <input
                id="reg-program"
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="BSc in Computing and Information System"
                className="cp-input"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-semester" className="cp-label">Semester <span className="text-red-600">*</span></label>
                <input
                  id="reg-semester"
                  type="number"
                  min={1}
                  max={20}
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="cp-input"
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-batch" className="cp-label">Batch <span className="text-red-600">*</span></label>
                <input
                  id="reg-batch"
                  type="text"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="Batch 15"
                  className="cp-input"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Student profile is created together with the account to avoid duplicate master-data entries.
            </p>
          </div>
        ) : null}

        {role === "faculty" ? (
          <div className="cp-card-2 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Faculty profile</p>
            <div>
              <label htmlFor="reg-employee-id" className="cp-label">Faculty ID (employee_id) <span className="text-red-600">*</span></label>
              <input
                id="reg-employee-id"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="FAC-001 / EMP-2026-12"
                className="cp-input"
                required
              />
            </div>
            <div>
              <label htmlFor="reg-designation" className="cp-label">Designation <span className="text-red-600">*</span></label>
              <input
                id="reg-designation"
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Lecturer / Assistant Professor"
                className="cp-input"
                required
              />
            </div>
            <div>
              <label htmlFor="reg-specialization" className="cp-label">Specialization <span className="font-normal text-zinc-400">(optional)</span></label>
              <input
                id="reg-specialization"
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="AI, Networks, Databases"
                className="cp-input"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Faculty ID is stored in the faculty profile and can be used for assignment/search.
            </p>
          </div>
        ) : null}

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
