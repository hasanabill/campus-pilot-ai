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
  section?: string;
};

const navItems: NavItem[] = [
  /* ── Core ── */
  { href: "/dashboard",           label: "Dashboard",        icon: "dashboard",     section: "core",   roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/chat",                label: "AI Chat",          icon: "chat",          section: "core",   roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/notifications",       label: "Notifications",    icon: "bell",          section: "core",   roles: ["student", "faculty", "admin", "registrar"] },
  { href: "/schedules",           label: "Schedules",        icon: "calendar",      section: "core",   roles: ["student", "faculty", "admin", "registrar"] },
  /* ── Student ── */
  { href: "/tickets/new",         label: "New Request",      icon: "plus",          section: "student", roles: ["student"] },
  { href: "/tickets",             label: "My Tickets",       icon: "ticket",        section: "student", roles: ["student"] },
  /* ── Management ── */
  { href: "/dashboard/tickets",   label: "Ticket Mgmt",      icon: "ticket",        section: "mgmt",   roles: ["faculty", "admin", "registrar"] },
  { href: "/dashboard/schedules", label: "Schedule Admin",   icon: "calendarEdit",  section: "mgmt",   roles: ["admin"] },
  { href: "/dashboard/documents", label: "Document Center",  icon: "doc",           section: "mgmt",   roles: ["faculty", "admin", "registrar"] },
  { href: "/dashboard/approvals", label: "Approvals",        icon: "check",         section: "mgmt",   roles: ["admin", "registrar"] },
  { href: "/dashboard/reports",   label: "Reports",          icon: "chart",         section: "mgmt",   roles: ["faculty", "admin", "registrar"] },
  /* ── Admin ── */
  { href: "/dashboard/kb",        label: "KB Upload",        icon: "upload",        section: "admin",  roles: ["admin"] },
  { href: "/dashboard/activity",  label: "Activity Log",     icon: "activity",      section: "admin",  roles: ["admin"] },
  { href: "/register",            label: "Create User",      icon: "user",          section: "admin",  roles: ["admin"] },
];

const sectionMeta: Record<string, { label: string }> = {
  core:    { label: "Main" },
  student: { label: "Requests" },
  mgmt:    { label: "Management" },
  admin:   { label: "Admin" },
};

const roleStyle: Record<AppRole, string> = {
  admin:     "border-violet-200 bg-violet-50 text-violet-700",
  faculty:   "border-sky-200    bg-sky-50    text-sky-700",
  registrar: "border-amber-200  bg-amber-50  text-amber-700",
  student:   "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ─── Icons ──────────────────────────────────────────────────── */
function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  const p = { fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.7, stroke: "currentColor", className, "aria-hidden": true as const };
  switch (name) {
    case "dashboard":    return <svg {...p}><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>;
    case "chat":         return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case "bell":         return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case "calendar":     return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case "calendarEdit": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M14 16.5l1.5-1.5 2 2L16 18.5zM12 18.5l2-2"/></svg>;
    case "plus":         return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>;
    case "ticket":       return <svg {...p}><path d="M2 9a1 1 0 0 1 0-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a1 1 0 0 1 0 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9z"/><path d="M12 6v12M7 12h2M15 12h2"/></svg>;
    case "doc":          return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>;
    case "check":        return <svg {...p}><path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>;
    case "chart":        return <svg {...p}><path d="M18 20V10M12 20V4M6 20v-6"/></svg>;
    case "upload":       return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>;
    case "activity":     return <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case "user":         return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "logout":       return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
    case "menu":         return <svg {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
    case "chevLeft":     return <svg {...p}><path d="M15 18l-6-6 6-6"/></svg>;
    case "chevRight":    return <svg {...p}><path d="M9 18l6-6-6-6"/></svg>;
    case "close":        return <svg {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    default:             return <svg {...p}><circle cx="12" cy="12" r="4"/></svg>;
  }
}

/* ─── Pagination control helper ─────────────────────────────── */
function PaginationRow({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button type="button" disabled={page <= 1} onClick={onPrev} className="cp-btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
        ← Prev
      </button>
      <span className="text-xs text-zinc-500">
        {page} / {Math.max(1, totalPages)}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={onNext} className="cp-btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
        Next →
      </button>
    </div>
  );
}

export { PaginationRow };

/* ─── Shell ──────────────────────────────────────────────────── */
export default function AppShellClient({
  user,
  children,
}: Readonly<{
  user: ShellUser | null;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const roleNav = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  /* Group visible items by section */
  const grouped = useMemo(() => {
    const map: Record<string, NavItem[]> = {};
    for (const item of roleNav) {
      const sec = item.section ?? "core";
      map[sec] = [...(map[sec] ?? []), item];
    }
    return map;
  }, [roleNav]);

  /* ── Public shell (no auth) ── */
  if (!user) {
    return (
      <div className="min-h-screen">
        <header className="cp-glass sticky top-0 z-50 border-b">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white text-xs font-bold">CP</span>
              <span>CampusPilot AI</span>
            </Link>
            <Link href="/login" className="cp-btn-primary text-sm">Sign in</Link>
          </div>
        </header>
        <div>{children}</div>
      </div>
    );
  }

  /* ── Authenticated shell ── */
  return (
    <div className="flex min-h-screen">

      {/* ── Sidebar ── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col cp-glass border-r transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Sidebar brand */}
        <div className={`flex h-14 shrink-0 items-center border-b px-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setMobileOpen(false)}>
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white text-xs font-bold">CP</span>
              <span className="truncate text-sm font-semibold text-zinc-900">CampusPilot</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white text-xs font-bold" onClick={() => setMobileOpen(false)}>CP</Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex cp-btn-ghost h-7 w-7 shrink-0 items-center justify-center rounded-md p-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name={collapsed ? "chevRight" : "chevLeft"} className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {Object.entries(grouped).map(([sec, items]) => (
            <div key={sec}>
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  {sectionMeta[sec]?.label ?? sec}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={[
                        "group flex items-center rounded-lg px-2.5 py-2 text-sm transition-all duration-150",
                        collapsed ? "justify-center" : "justify-start gap-3",
                        active
                          ? "bg-zinc-900 font-medium text-white shadow-sm"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                      ].join(" ")}
                    >
                      <span className={[
                        "inline-flex shrink-0 h-6 w-6 items-center justify-center rounded-md transition-colors",
                        active ? "text-white" : "text-zinc-500 group-hover:text-zinc-700",
                      ].join(" ")}>
                        <Icon name={item.icon} />
                      </span>
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar user strip */}
        <div className={`border-t px-3 py-3 ${collapsed ? "flex justify-center" : ""}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                {(user.name[0] ?? "U").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-900">{user.name}</p>
                <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium capitalize ${roleStyle[user.role]}`}>
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                title="Sign out"
                onClick={() => void signOut({ callbackUrl: "/login" })}
                className="cp-btn-ghost h-7 w-7 shrink-0 rounded-md p-0 text-zinc-400 hover:text-red-600"
              >
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              title="Sign out"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="cp-btn-ghost h-8 w-8 rounded-md p-0 text-zinc-400 hover:text-red-600"
            >
              <Icon name="logout" className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-zinc-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="cp-glass sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="cp-btn-ghost h-8 w-8 rounded-md p-0"
            aria-label="Toggle navigation"
          >
            <Icon name={mobileOpen ? "close" : "menu"} className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-zinc-900">CampusPilot AI</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
            {(user.name[0] ?? "U").toUpperCase()}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}
