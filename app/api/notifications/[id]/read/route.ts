import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { updateNotificationReadSchema, updateNotificationReadState } from "@/services/notificationService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = updateNotificationReadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }
    const { id } = await context.params;
    const notification = await updateNotificationReadState(session.user.id, id, parsed.data.is_read);
    if (!notification) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    return NextResponse.json({ notification }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
