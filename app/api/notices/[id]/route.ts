import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deleteNotice } from "@/services/noticeService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const notice = await deleteNotice({ role: session.user.role }, id);
    if (!notice) {
      return NextResponse.json({ error: "Notice not found." }, { status: 404 });
    }

    return NextResponse.json({ notice }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notice deletion failed.";
    const status = message.includes("Only") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
