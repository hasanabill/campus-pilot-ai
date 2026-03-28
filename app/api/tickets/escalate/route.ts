import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { runEscalationSweep } from "@/services/ticketService";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await runEscalationSweep({
      userId: session.user.id,
      role: session.user.role,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Escalation sweep failed.";
    const status = message.includes("Only faculty/admin/registrar") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
