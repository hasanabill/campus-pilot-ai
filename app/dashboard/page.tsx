import Link from "next/link";

import EmptyState from "@/components/ui/EmptyState";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { auth } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/routeGuards";
import { getDashboardOverview, getStudentDashboardOverview } from "@/services/dashboardService";

const quickActions = [
  { href: "/chat",        label: "Ask AI",          desc: "Chat with AI assistant" },
  { href: "/tickets/new", label: "New Request",      desc: "Submit a support ticket" },
  { href: "/tickets",     label: "Track Requests",   desc: "View your open tickets" },
  { href: "/schedules",   label: "View Schedules",   desc: "Browse course schedules" },
];

export default async function DashboardPage() {
  const session = await auth();
  const user    = requireAuthenticatedUser(session);
  const sessionUser = session?.user;
  if (!sessionUser) return null;

  /* ── Student dashboard ── */
  if (user.role === "student") {
    const overview = await getStudentDashboardOverview(user.id);

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title={`Welcome, ${sessionUser.name?.split(" ")[0] ?? "Student"} 👋`}
          subtitle="Here's everything happening in your account today."
        />

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Open Tickets"          value={overview.metrics.my_open_tickets}       accent="sky" />
          <MetricCard label="Unread Notifications"  value={overview.metrics.unread_notifications}   accent="amber" />
          <MetricCard label="Total Notifications"   value={overview.metrics.notifications_total} />
        </div>

        {/* Quick actions */}
        <div className="cp-card">
          <p className="cp-section-title mb-3">Quick actions</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 hover:border-zinc-300 hover:bg-white hover:shadow-sm transition"
              >
                <span className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700">{a.label}</span>
                <span className="text-xs text-zinc-400">{a.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming schedule */}
        <div className="cp-card">
          <p className="cp-section-title mb-3">Upcoming schedule</p>
          {!overview.upcoming_schedule.has_item ? (
            <EmptyState
              title="No upcoming schedule"
              description="Your schedule items will appear here once published."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Day",      overview.upcoming_schedule.day],
                ["Time",     `${overview.upcoming_schedule.start_time} – ${overview.upcoming_schedule.end_time}`],
                ["Semester", overview.upcoming_schedule.semester],
                ["Section",  overview.upcoming_schedule.section],
              ].map(([k, v]) => (
                <div key={k} className="cp-card-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{k}</p>
                  <p className="mt-0.5 text-sm font-medium text-zinc-900">{v}</p>
                </div>
              ))}
              <div className="sm:col-span-2">
                <StatusBadge label={overview.upcoming_schedule.status ?? "unknown"} />
              </div>
            </div>
          )}
        </div>

        {/* Recent notifications */}
        <div className="cp-card">
          <p className="cp-section-title mb-3">Recent notifications</p>
          {overview.recent_notifications.length === 0 ? (
            <EmptyState title="No notifications yet" description="Updates will appear here." />
          ) : (
            <ul className="space-y-2">
              {overview.recent_notifications.map((item) => (
                <li key={item.id} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <StatusBadge label={item.type} tone={item.is_read ? "muted" : "info"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-900">{item.message}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  /* ── Admin / Faculty / Registrar dashboard ── */
  const overview = await getDashboardOverview({ requester_role: user.role, requester_user_id: user.id });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="System overview and recent activity."
        actions={
          <div className="flex items-center gap-2">
            <span className="cp-section-title">Signed in as</span>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 shadow-sm">
              {sessionUser.name}
            </span>
          </div>
        }
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tickets"             value={overview.metrics.tickets_total}         accent="sky" />
        <MetricCard label="Chatbot Sessions"    value={overview.metrics.chatbot_usage_total}   accent="indigo" />
        <MetricCard label="Pending Approvals"   value={overview.metrics.pending_approvals}     accent="amber" />
        <MetricCard label="Activity Events"     value={overview.metrics.system_activity_events} />
      </div>

      {/* Profile summary */}
      <div className="cp-card">
        <p className="cp-section-title mb-3">Account</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Name",       sessionUser.name ?? "-"],
            ["Email",      sessionUser.email ?? "-"],
            ["Role",       sessionUser.role ?? "-"],
            ["Department", sessionUser.department_id ?? "N/A"],
          ].map(([k, v]) => (
            <div key={k} className="cp-card-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{k}</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-900">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="cp-card">
        <p className="cp-section-title mb-3">Recent activity</p>
        {overview.activity.length === 0 ? (
          <EmptyState title="No recent activity" description="Events will appear here as the system is used." />
        ) : (
          <ul className="space-y-2">
            {overview.activity.map((item, index) => (
              <li
                key={`${item.type}-${item.timestamp}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
              >
                <StatusBadge label={item.type} tone="muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-900">{item.description}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
