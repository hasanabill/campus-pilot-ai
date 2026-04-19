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
  icon: string;
  roles: AppRole[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/chat", label: "Chat", icon: "chat", roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/notifications", label: "Notifications", icon: "notifications", roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/tickets/new", label: "New Request", icon: "newTicket", roles: ["student"] },
  { href: "/tickets", label: "My Tickets", icon: "tickets", roles: ["student"] },
  { href: "/dashboard/tickets", label: "Ticket Management", icon: "ticketAdmin", roles: ["faculty", "admin", "registrar"] },
  { href: "/schedules", label: "Schedules", icon: "schedule", roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/dashboard/schedules", label: "Schedule Admin", icon: "scheduleAdmin", roles: ["admin"] },
  { href: "/dashboard/kb", label: "KB Upload", icon: "kb", roles: ["admin"] },
  { href: "/dashboard/activity", label: "Activity Log", icon: "activity", roles: ["admin"] },
  { href: "/dashboard/documents", label: "Document Center", icon: "documents", roles: ["faculty", "admin", "registrar"] },
  { href: "/dashboard/approvals", label: "Approvals", icon: "approvals", roles: ["admin", "registrar"] },
  { href: "/dashboard/reports", label: "Reports", icon: "reports", roles: ["faculty", "admin", "registrar"] },
  { href: "/register", label: "Create User", icon: "users", roles: ["admin"] },
];

function roleBadgeClass(role: AppRole): string {
  switch (role) {
    case "admin":
      return "border-violet-300 bg-violet-50 text-zinc-900";
    case "faculty":
      return "border-sky-300 bg-sky-50 text-zinc-900";
    case "registrar":
      return "border-amber-300 bg-amber-50 text-zinc-900";
    default:
      return "border-emerald-300 bg-emerald-50 text-zinc-900";
  }
}

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const common = {
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.8,
    stroke: "currentColor",
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return <svg {...common}><path d="M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z" /></svg>;
    case "chat":
      return <svg {...common}><path d="M5 6h14v9H8l-3 3z" /></svg>;
    case "notifications":
      return <svg {...common}><path d="M12 4a4 4 0 0 1 4 4v3.5l1.5 2V15H6.5v-1.5L8 11.5V8a4 4 0 0 1 4-4zM10 18a2 2 0 0 0 4 0" /></svg>;
    case "newTicket":
      return <svg {...common}><path d="M5 6h14v5a2 2 0 0 0 0 4v3H5v-3a2 2 0 0 0 0-4zM12 9v6M9 12h6" /></svg>;
    case "tickets":
    case "ticketAdmin":
      return <svg {...common}><path d="M5 6h14v5a2 2 0 0 0 0 4v3H5v-3a2 2 0 0 0 0-4z" /></svg>;
    case "schedule":
    case "scheduleAdmin":
      return <svg {...common}><path d="M7 4v3M17 4v3M5 8h14v11H5zM5 12h14" /></svg>;
    case "kb":
      return <svg {...common}><path d="M6 5h8l4 4v10H6zM14 5v4h4" /></svg>;
    case "activity":
      return <svg {...common}><path d="M4 12h4l2-5 4 10 2-5h4" /></svg>;
    case "documents":
      return <svg {...common}><path d="M7 4h7l4 4v12H7zM14 4v4h4" /></svg>;
    case "approvals":
      return <svg {...common}><path d="M5 13l4 4L19 7" /></svg>;
    case "reports":
      return <svg {...common}><path d="M6 18V8M12 18V5M18 18v-7" /></svg>;
    case "users":
      return <svg {...common}><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M17 8a3 3 0 1 1 0 6M10 9a3 3 0 1 1 0-6" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="3" /></svg>;
  }
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const roleNav = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const hideShell = !user || pathname === "/login";

  if (hideShell) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-semibold text-zinc-900 shadow-sm"
            >
              CampusPilot AI
            </Link>
            {!user ? (
              <Link
                href="/login"
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-100"
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
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 shadow-sm backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:bg-zinc-100 lg:hidden"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              <span aria-hidden>{sidebarOpen ? "X" : "≡"}</span>
            </button>
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-linear-to-r from-white to-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900 shadow-sm"
            >
              CampusPilot AI
            </Link>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize shadow-sm ${roleBadgeClass(user.role)}`}
            >
              {user.role}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 shadow-sm hover:bg-zinc-100"
            >
              Notifications
            </Link>
            <span className="hidden text-xs text-zinc-900 md:inline">{user.name}</span>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex w-full items-start gap-4 py-4 pr-4">
        <aside
          className={[
            "app-surface shrink-0 rounded-r-3xl border border-l-0 border-zinc-200 p-3 transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-20" : "w-64",
            sidebarOpen ? "block" : "hidden",
            "lg:block",
          ].join(" ")}
        >
          <div className="mb-2 hidden items-center justify-between lg:flex">
            <span
              className={[
                "text-xs font-semibold uppercase tracking-wide text-zinc-900 transition-all duration-300",
                sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100",
              ].join(" ")}
            >
              Navigation
            </span>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 shadow-sm hover:bg-zinc-100"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? ">>" : "<<"}
            </button>
          </div>
          <nav className="space-y-1">
            {roleNav.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={[
                    "group relative flex items-center rounded-xl px-3 py-2 text-sm transition-all duration-200",
                    sidebarCollapsed ? "justify-center" : "justify-start",
                    active
                      ? "bg-zinc-900 font-medium text-white shadow-md"
                      : "text-zinc-900 hover:bg-white hover:shadow-sm",
                  ].join(" ")}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white/80"
                    />
                  ) : null}
                  <span
                    className={[
                      "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                      active
                        ? "bg-white/15 text-white"
                        : "bg-zinc-100 text-zinc-900 group-hover:bg-zinc-200",
                    ].join(" ")}
                  >
                    <NavIcon name={item.icon} />
                  </span>
                  <span
                    className={[
                      "ml-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                      sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl">{children}</main>
      </div>
    </div>
  );
}
