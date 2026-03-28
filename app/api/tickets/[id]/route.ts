import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getTicketById, updateTicket, updateTicketSchema } from "@/services/ticketService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await getTicketById(
      { userId: session.user.id, role: session.user.role },
      id,
    );

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch ticket.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = await params;
    const ticket = await updateTicket(
      { userId: session.user.id, role: session.user.role },
      id,
      parsed.data,
    );
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ticket update failed.";
    const status = message.includes("Only faculty/admin/registrar") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
