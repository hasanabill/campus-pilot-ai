import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { broadcastNotification, broadcastNotificationSchema } from "@/services/notificationService";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (session.user.role !== "admin" && session.user.role !== "registrar") {
      return NextResponse.json({ error: "Only admin/registrar can broadcast notifications." }, { status: 403 });
    }
    const parsed = broadcastNotificationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }
    return NextResponse.json(await broadcastNotification(parsed.data), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Broadcast failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
