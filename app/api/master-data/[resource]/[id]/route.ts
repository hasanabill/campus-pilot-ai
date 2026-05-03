import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deleteMasterData, resourceSchema, updateMasterData } from "@/services/masterDataService";

type RouteContext = {
  params: Promise<{ resource: string; id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { resource, id } = await context.params;
    const parsedResource = resourceSchema.safeParse(resource);
    if (!parsedResource.success) {
      return NextResponse.json({ error: "Unknown master-data resource." }, { status: 404 });
    }

    const body = await request.json();
    const item = await updateMasterData({ role: session.user.role }, parsedResource.data, id, body);
    if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });
    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update master data.";
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

    const { resource, id } = await context.params;
    const parsedResource = resourceSchema.safeParse(resource);
    if (!parsedResource.success) {
      return NextResponse.json({ error: "Unknown master-data resource." }, { status: 404 });
    }

    const item = await deleteMasterData({ role: session.user.role }, parsedResource.data, id);
    if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });
    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete master data.";
    const status = message.includes("Only admin") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
