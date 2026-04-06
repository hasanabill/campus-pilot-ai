import { redirect } from "next/navigation";
import Link from "next/link";

import EmptyState from "@/components/ui/EmptyState";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { auth } from "@/lib/auth";
import { getDashboardOverview, getStudentDashboardOverview } from "@/services/dashboardService";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "student") {
    const studentOverview = await getStudentDashboardOverview(session.user.id);

    return (
      <main className="mx-auto max-w-6xl p-2 md:p-4">
        <PageHeader title="Student Dashboard" subtitle="Your requests, notifications, and upcoming schedule." />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="My Open Tickets" value={studentOverview.metrics.my_open_tickets} />
          <MetricCard label="Unread Notifications" value={studentOverview.metrics.unread_notifications} />
          <MetricCard label="Total Notifications" value={studentOverview.metrics.notifications_total} />
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Quick Actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/chat"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
            >
              Ask AI
            </Link>
            <Link
              href="/tickets/new"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
            >
              New Request
            </Link>
            <Link
              href="/tickets"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
            >
              Track Requests
            </Link>
            <Link
              href="/schedules"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100"
            >
              View Schedules
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Upcoming Schedule Snippet</h2>
          {!studentOverview.upcoming_schedule.has_item ? (
            <div className="mt-3">
              <EmptyState
                title="No upcoming schedule found"
                description="Your schedule items will appear here once published."
              />
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p>
                <span className="font-medium text-zinc-900">Day:</span>{" "}
                {studentOverview.upcoming_schedule.day}
              </p>
              <p>
                <span className="font-medium text-zinc-900">Time:</span>{" "}
                {studentOverview.upcoming_schedule.start_time} - {studentOverview.upcoming_schedule.end_time}
              </p>
              <p>
                <span className="font-medium text-zinc-900">Semester:</span>{" "}
                {studentOverview.upcoming_schedule.semester}
              </p>
              <p>
                <span className="font-medium text-zinc-900">Section:</span>{" "}
                {studentOverview.upcoming_schedule.section}
              </p>
              <div className="mt-1">
                <StatusBadge label={studentOverview.upcoming_schedule.status ?? "unknown"} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Recent Notifications</h2>
          {studentOverview.recent_notifications.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No notifications yet" description="New updates will show here." />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {studentOverview.recent_notifications.map((item) => (
                <li key={item.id} className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-sm font-medium text-zinc-900">{item.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
                    <StatusBadge label={item.type} tone={item.is_read ? "muted" : "info"} />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    );
  }

  const overview = await getDashboardOverview({
    requester_role: session.user.role,
    requester_user_id: session.user.id,
  });

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <PageHeader title="Dashboard" subtitle="System overview and recent activity." />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tickets" value={overview.metrics.tickets_total} />
        <MetricCard label="Chatbot Usage" value={overview.metrics.chatbot_usage_total} />
        <MetricCard label="Pending Approvals" value={overview.metrics.pending_approvals} />
        <MetricCard label="Recent Activity Items" value={overview.metrics.system_activity_events} />
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Recent Activity</h2>
        {overview.activity.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="No recent activity" description="Recent events will appear here." />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {overview.activity.map((item, index) => (
              <li
                key={`${item.type}-${item.timestamp}-${index}`}
                className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
              >
                <p className="text-sm font-medium text-zinc-900">{item.description}</p>
                <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
                  <StatusBadge label={item.type} tone="muted" />
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <p>
          <span className="font-semibold">Name:</span> {session.user.name}
        </p>
        <p>
          <span className="font-semibold">Email:</span> {session.user.email}
        </p>
        <p>
          <span className="font-semibold">Role:</span> {session.user.role}
        </p>
        <p>
          <span className="font-semibold">Department:</span>{" "}
          {session.user.department_id ?? "N/A"}
        </p>
      </div>
    </main>
  );
}
