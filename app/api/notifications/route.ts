import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createNotification,
  createNotificationSchema,
  listNotificationsForUser,
  listNotificationsQuerySchema,
} from "@/services/notificationService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listNotificationsQuerySchema.safeParse({
      type: searchParams.get("type") ?? undefined,
      is_read:
        searchParams.get("is_read") === null
          ? undefined
          : searchParams.get("is_read") === "true",
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const notifications = await listNotificationsForUser(session.user.id, parsed.data);
    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "registrar") {
      return NextResponse.json(
        { error: "Only admin/registrar can create notifications manually." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const notification = await createNotification(parsed.data);
    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification creation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
