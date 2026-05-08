import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { suggestTicketDraft, suggestTicketSchema } from "@/services/ticketService";
import { enforceRateLimit } from "@/utils/request";

export async function POST(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "tickets-suggest",
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many ticket suggestion requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role !== "student") {
      return NextResponse.json({ error: "Only students can request ticket suggestions." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = suggestTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await suggestTicketDraft({ userId: session.user.id, role: session.user.role }, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ticket suggestion failed.";
    const status = message.includes("disabled") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
