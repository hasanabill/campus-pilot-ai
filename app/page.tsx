import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-zinc-900">Campus Pilot AI</h1>
        <p className="mt-2 text-zinc-600">
          Sign in to access the platform. New accounts are created by department
          admins.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
