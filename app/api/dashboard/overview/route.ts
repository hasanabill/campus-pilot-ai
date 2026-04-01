import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDashboardOverview } from "@/services/dashboardService";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const overview = await getDashboardOverview({
      requester_role: session.user.role,
      requester_user_id: session.user.id,
    });

    return NextResponse.json(overview, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard overview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
