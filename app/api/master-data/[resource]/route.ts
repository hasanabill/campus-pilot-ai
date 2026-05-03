import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createMasterData,
  listMasterData,
  listMasterDataQuerySchema,
  resourceSchema,
} from "@/services/masterDataService";

type RouteContext = {
  params: Promise<{ resource: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { resource } = await context.params;
    const parsedResource = resourceSchema.safeParse(resource);
    if (!parsedResource.success) {
      return NextResponse.json({ error: "Unknown master-data resource." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = listMasterDataQuerySchema.safeParse({
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await listMasterData(parsedResource.data, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list master data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { resource } = await context.params;
    const parsedResource = resourceSchema.safeParse(resource);
    if (!parsedResource.success) {
      return NextResponse.json({ error: "Unknown master-data resource." }, { status: 404 });
    }

    const body = await request.json();
    const item = await createMasterData({ role: session.user.role }, parsedResource.data, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create master data.";
    const status = message.includes("Only admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
