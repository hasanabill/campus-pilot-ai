import Link from "next/link";

const features = [
  {
    icon: "💬",
    title: "AI Chat Assistant",
    desc: "RAG-powered assistant answers student questions about regulations, schedules, and processes instantly.",
  },
  {
    icon: "🎫",
    title: "Service Tickets",
    desc: "Submit, track, escalate, and resolve department requests through a structured ticket workflow.",
  },
  {
    icon: "📅",
    title: "Smart Scheduling",
    desc: "Manage course and room scheduling with built-in conflict detection and change logs.",
  },
  {
    icon: "📄",
    title: "Document Center",
    desc: "AI-assisted document generation — certificates, letters, and meeting minutes — stored on Cloudinary.",
  },
  {
    icon: "🔔",
    title: "Notifications",
    desc: "Role-targeted in-app alerts for ticket updates, approvals, schedule changes, and announcements.",
  },
  {
    icon: "📊",
    title: "Reports & Analytics",
    desc: "Admin dashboards with system-wide metrics, CSV exports, and exportable snapshots.",
  },
];

const roles = [
  {
    name: "Student",
    color: "border-emerald-200 bg-emerald-50",
    pill: "bg-emerald-100 text-emerald-700",
    actions: ["Ask AI assistant", "Submit service tickets", "Track requests", "View schedules"],
  },
  {
    name: "Faculty",
    color: "border-sky-200 bg-sky-50",
    pill: "bg-sky-100 text-sky-700",
    actions: ["Manage ticket queue", "Generate documents", "Review schedules", "View reports"],
  },
  {
    name: "Admin",
    color: "border-violet-200 bg-violet-50",
    pill: "bg-violet-100 text-violet-700",
    actions: ["Provision accounts", "Oversee all tickets", "Manage schedules", "Upload KB docs", "View activity logs"],
  },
  {
    name: "Registrar",
    color: "border-amber-200 bg-amber-50",
    pill: "bg-amber-100 text-amber-700",
    actions: ["Handle approvals", "Coordinate reporting", "Review escalations", "Document operations"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500 shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Academic Department Assistant · Powered by AI
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-zinc-900 md:text-5xl lg:text-[3.25rem]">
              The smart hub for <br className="hidden md:block" />
              <span className="text-zinc-500">department operations.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-500 md:text-lg">
              CampusPilot AI automates student services — ticket workflows, scheduling,
              document generation, and AI-assisted support — all in one secure, role-based platform.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/login" className="cp-btn-primary text-sm px-5 py-2.5">
                Sign in to CampusPilot →
              </Link>
              <span className="text-sm text-zinc-400">
                Accounts are provisioned by department admins.
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Next.js App Router", "OpenAI RAG", "MongoDB Atlas", "Role-based Access", "Cloudinary Storage"].map((t) => (
                <span key={t} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-500 shadow-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Snapshot card */}
          <div className="cp-card space-y-3">
            <p className="cp-section-title">Platform at a glance</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Users",      "Student · Faculty · Admin · Registrar"],
                ["AI model",   "GPT-4o with RAG pipeline"],
                ["Ticketing",  "Submit, assign, escalate, resolve"],
                ["Scheduling", "Conflict detection + changelogs"],
                ["Documents",  "AI-generated PDFs, Cloudinary"],
                ["Security",   "JWT sessions, RBAC, audit logs"],
              ].map(([k, v]) => (
                <div key={k} className="cp-card-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{k}</p>
                  <p className="mt-1 text-xs font-medium text-zinc-900 leading-snug">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-8 text-center">
          <p className="cp-section-title">What&rsquo;s inside</p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900">
            Everything a department needs, automated.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="cp-card group hover:shadow-md transition-shadow">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-8 text-center">
          <p className="cp-section-title">Role-based experience</p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900">
            Every role gets a tailored workspace.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <div key={r.name} className={`rounded-xl border p-5 shadow-sm ${r.color}`}>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.pill}`}>
                {r.name}
              </span>
              <ul className="mt-3 space-y-1.5">
                {r.actions.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm text-zinc-700">
                    <span className="mt-0.5 shrink-0 text-zinc-400">·</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Getting started ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="cp-card">
          <div className="mb-6 text-center">
            <p className="cp-section-title">Getting started</p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900">Three steps to get going.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Receive your credentials", desc: "Your department admin provisions your account and shares a one-time password." },
              { step: "02", title: "Sign in and explore", desc: "The sidebar shows only the routes your role can access — no confusion, no noise." },
              { step: "03", title: "Use guided workflows", desc: "Submit requests, collaborate through tickets, and get instant AI answers on policies." },
            ].map((s) => (
              <div key={s.step} className="cp-card-2">
                <p className="text-3xl font-bold text-zinc-200">{s.step}</p>
                <h3 className="mt-2 text-sm font-semibold text-zinc-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/login" className="cp-btn-primary text-sm px-6 py-2.5">
              Sign in to CampusPilot →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
