import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createTicketMessage,
  createTicketMessageSchema,
  listTicketMessages,
} from "@/services/ticketMessageService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { id } = await context.params;
    const result = await listTicketMessages({ userId: session.user.id, role: session.user.role }, id);
    if (!result) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ticket messages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const parsed = createTicketMessageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
    }
    const { id } = await context.params;
    const message = await createTicketMessage({ userId: session.user.id, role: session.user.role }, id, parsed.data);
    if (!message) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create ticket message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
