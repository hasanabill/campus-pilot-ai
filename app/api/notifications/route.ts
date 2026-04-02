import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createNotification,
  createNotificationSchema,
  listNotificationsForUser,
  listNotificationsQuerySchema,
} from "@/services/notificationService";
import { enforceRateLimit } from "@/utils/request";

export async function GET(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "notifications-get",
      windowMs: 60_000,
      maxRequests: 80,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

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
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await listNotificationsForUser(session.user.id, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "notifications-post",
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

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
