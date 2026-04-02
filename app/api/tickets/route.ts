import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createTicket,
  createTicketSchema,
  listTickets,
  listTicketsQuerySchema,
} from "@/services/ticketService";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const ticket = await createTicket(
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ticket creation failed.";
    const status = message.includes("not found") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listTicketsQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await listTickets(
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tickets.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
