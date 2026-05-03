import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createFaq, createFaqSchema, listFaqQuerySchema, listFaqs } from "@/services/faqService";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const parsed = listFaqQuerySchema.safeParse({
      category: searchParams.get("category") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      is_active:
        searchParams.get("is_active") === null
          ? undefined
          : searchParams.get("is_active") === "true",
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await listFaqs(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load FAQs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = createFaqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const faq = await createFaq({ role: session.user.role }, parsed.data);
    return NextResponse.json({ faq }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FAQ creation failed.";
    const status = message.includes("Only admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
