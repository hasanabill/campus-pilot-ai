import Link from "next/link";

import { auth, signOut } from "@/lib/auth";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function Navbar() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-5">
          <Link href="/" className="text-sm font-semibold text-zinc-900">
            CampusPilot AI
          </Link>

          <nav className="flex items-center gap-3 text-sm text-zinc-600">
            <Link href="/" className="hover:text-zinc-900">
              Home
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-900">
              Dashboard
            </Link>
            <Link href="/chat" className="hover:text-zinc-900">
              Chat
            </Link>
            <Link href="/schedules" className="hover:text-zinc-900">
              Schedules
            </Link>
            <Link href="/tickets" className="hover:text-zinc-900">
              Tickets
            </Link>
            <Link href="/tickets/new" className="hover:text-zinc-900">
              New Ticket
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard/tickets" className="hover:text-zinc-900">
                Ticket Admin
              </Link>
            ) : null}
            {isAuthenticated ? (
              <Link href="/dashboard/schedules" className="hover:text-zinc-900">
                Schedule Admin
              </Link>
            ) : null}
            {isAuthenticated ? (
              <Link href="/dashboard/reports" className="hover:text-zinc-900">
                Reports
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <form action={handleSignOut}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
