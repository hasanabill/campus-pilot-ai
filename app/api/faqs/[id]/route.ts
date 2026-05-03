import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deleteFaq, updateFaq } from "@/services/faqService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const faq = await updateFaq({ role: session.user.role }, id, body);
    if (!faq) return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
    return NextResponse.json({ faq }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAQ update failed.";
    const status = message.includes("Only admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await context.params;
    const faq = await deleteFaq({ role: session.user.role }, id);
    if (!faq) return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
    return NextResponse.json({ faq }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAQ deletion failed.";
    const status = message.includes("Only admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
