import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { dispatchDueTaskReminders } from "@/services/workflowTaskService";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const result = await dispatchDueTaskReminders({ role: session.user.role });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder dispatch failed.";
    const status = message.includes("Only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
