import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-zinc-600">Authenticated user context for Phase 2.</p>

      <div className="mt-6 rounded-lg border border-zinc-200 p-4">
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
