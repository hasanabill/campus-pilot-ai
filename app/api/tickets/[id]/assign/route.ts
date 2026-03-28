import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { assignTicket, assignTicketSchema } from "@/services/ticketService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = assignTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = await params;
    const ticket = await assignTicket(
      { userId: session.user.id, role: session.user.role },
      id,
      parsed.data,
    );
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assignment failed.";
    const status = message.includes("Only faculty/admin/registrar") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
