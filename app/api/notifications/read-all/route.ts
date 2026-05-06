import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { markAllNotificationsRead } from "@/services/notificationService";

export async function PATCH() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    return NextResponse.json(await markAllNotificationsRead(session.user.id), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to mark notifications read.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
