"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type AppRole = "student" | "faculty" | "admin" | "registrar";

type ShellUser = {
  id: string;
  name: string;
  email: string | null;
  role: AppRole;
};

type NavItem = {
  href: string;
  label: string;
  roles: AppRole[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/chat", label: "Chat", roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/notifications", label: "Notifications", roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/tickets/new", label: "New Request", roles: ["student"] },
  { href: "/tickets", label: "My Tickets", roles: ["student"] },
  { href: "/dashboard/tickets", label: "Ticket Management", roles: ["faculty", "admin", "registrar"] },
  { href: "/schedules", label: "Schedules", roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/dashboard/schedules", label: "Schedule Admin", roles: ["admin"] },
  { href: "/dashboard/kb", label: "KB Upload", roles: ["admin"] },
  { href: "/dashboard/activity", label: "Activity Log", roles: ["admin"] },
  { href: "/dashboard/documents", label: "Document Center", roles: ["faculty", "admin", "registrar"] },
  { href: "/dashboard/approvals", label: "Approvals", roles: ["admin", "registrar"] },
  { href: "/dashboard/reports", label: "Reports", roles: ["faculty", "admin", "registrar"] },
  { href: "/register", label: "Create User", roles: ["admin"] },
];

function roleBadgeClass(role: AppRole): string {
  switch (role) {
    case "admin":
      return "border-violet-300 bg-violet-50 text-violet-700";
    case "faculty":
      return "border-sky-300 bg-sky-50 text-sky-700";
    case "registrar":
      return "border-amber-300 bg-amber-50 text-amber-700";
    default:
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }
}

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShellClient({
  user,
  children,
}: Readonly<{
  user: ShellUser | null;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roleNav = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const hideShell = !user || pathname === "/login";

  if (hideShell) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="text-sm font-semibold text-zinc-900">
              CampusPilot AI
            </Link>
            {!user ? (
              <Link
                href="/login"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 lg:hidden"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              <span aria-hidden>{sidebarOpen ? "X" : "≡"}</span>
            </button>
            <Link href="/" className="text-sm font-semibold text-zinc-900">
              CampusPilot AI
            </Link>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${roleBadgeClass(user.role)}`}
            >
              {user.role}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100"
            >
              Notifications
            </Link>
            <span className="hidden text-xs text-zinc-500 md:inline">{user.name}</span>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-4 px-4 py-4">
        <aside
          className={[
            "w-64 shrink-0 rounded-xl border border-zinc-200 bg-white p-3",
            sidebarOpen ? "block" : "hidden",
            "lg:block",
          ].join(" ")}
        >
          <nav className="space-y-1">
            {roleNav.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={[
                    "block rounded-md px-3 py-2 text-sm",
                    active
                      ? "bg-zinc-900 font-medium text-white"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
