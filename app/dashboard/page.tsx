import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getDashboardOverview } from "@/services/dashboardService";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const overview = await getDashboardOverview({
    requester_role: session.user.role,
    requester_user_id: session.user.id,
  });

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-zinc-600">System overview and recent activity.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">Tickets</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {overview.metrics.tickets_total}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">Chatbot Usage</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {overview.metrics.chatbot_usage_total}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">Pending Approvals</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {overview.metrics.pending_approvals}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-600">Recent Activity Items</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {overview.metrics.system_activity_events}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-zinc-900">Recent Activity</h2>
        {overview.activity.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No recent activity.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {overview.activity.map((item, index) => (
              <li
                key={`${item.type}-${item.timestamp}-${index}`}
                className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
              >
                <p className="text-sm font-medium text-zinc-900">{item.description}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  {item.type} • {new Date(item.timestamp).toLocaleString()}
                </p>
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
