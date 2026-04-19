import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50">
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-900">
              Academic Department Assistant
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
              CampusPilot AI keeps student services fast, clear, and organized.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-zinc-900 md:text-lg">
              Manage ticket workflows, schedule planning, document operations, and
              knowledge-based AI support from one secure role-based platform.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Sign in to CampusPilot
              </Link>
              <span className="text-sm text-zinc-900">
                New accounts are created by department admins.
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-900">
              <span className="rounded-full border border-zinc-300 bg-white px-3 py-1">
                AI Chat + RAG
              </span>
              <span className="rounded-full border border-zinc-300 bg-white px-3 py-1">
                Ticketing Workflow
              </span>
              <span className="rounded-full border border-zinc-300 bg-white px-3 py-1">
                Scheduling + Conflict Detection
              </span>
              <span className="rounded-full border border-zinc-300 bg-white px-3 py-1">
                Role-based Security
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
              Platform Snapshot
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-900">Primary users</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  Students, Faculty, Admins, Registrars
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-900">Core model</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  Service-first with AI augmentation
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-900">Built for</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  Department operations and scale
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs text-zinc-900">Data posture</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  Auditable actions and protected routes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6 md:pb-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Getting Started Guidelines</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
                1. Access
              </p>
              <p className="mt-2 text-sm text-zinc-900">
                Sign in using the credentials provisioned by your department admin.
              </p>
            </article>
            <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
                2. Navigate by Role
              </p>
              <p className="mt-2 text-sm text-zinc-900">
                The sidebar shows only the routes and actions your role can use.
              </p>
            </article>
            <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
                3. Use Guided Workflows
              </p>
              <p className="mt-2 text-sm text-zinc-900">
                Submit requests, track progress, and collaborate through centralized flows.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 md:pb-16">
        <h2 className="text-2xl font-semibold text-zinc-900">Experience by Role</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900">Student</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-900">
              <li>Ask AI assistant for policies and process help.</li>
              <li>Submit support tickets and follow updates.</li>
              <li>View class schedules and receive notifications.</li>
            </ul>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900">Faculty</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-900">
              <li>Manage tickets and assist student requests.</li>
              <li>Generate and upload department documents.</li>
              <li>Review analytics and operational summaries.</li>
            </ul>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900">Department Admin</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-900">
              <li>Provision user accounts and assign roles.</li>
              <li>Oversee schedule operations and conflicts.</li>
              <li>Track system activity and approval queues.</li>
            </ul>
          </article>
          <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900">Registrar</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-900">
              <li>Handle escalated workflows and approvals.</li>
              <li>Coordinate institutional reporting outputs.</li>
              <li>Maintain cross-department process quality.</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
