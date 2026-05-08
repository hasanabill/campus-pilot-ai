import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  clearChatSessionForUser,
  createChatRequestSchema,
  createChatResponseAndLog,
  getChatSessionForUser,
} from "@/services/chatService";
import { enforceRateLimit } from "@/utils/request";

export async function GET(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "chat-get",
      windowMs: 60_000,
      maxRequests: 60,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many chat requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await getChatSessionForUser(session.user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chat session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "chat-post",
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many chat requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createChatResponseAndLog({
      ...parsed.data,
      user_id: session.user.id,
      role: session.user.role,
      department_id: session.user.department_id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "chat-delete",
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many chat clear requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const result = await clearChatSessionForUser(session.user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear chat session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
