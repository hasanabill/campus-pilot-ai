import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center p-4">
      <section className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-900">
          Access Control
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          You are not authorized
        </h1>
        <p className="mt-2 text-sm text-zinc-900">
          Your account does not have permission to access this page. If this is
          unexpected, contact your department administrator.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
