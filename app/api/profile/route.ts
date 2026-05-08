import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getProfile, updateProfile, updateProfileSchema } from "@/services/profileService";
import { enforceRateLimit } from "@/utils/request";

export async function GET(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "profile-get",
      windowMs: 60_000,
      maxRequests: 60,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const profile = await getProfile(session.user.id);
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const rate = enforceRateLimit(request, {
      name: "profile-patch",
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const profile = await updateProfile(session.user.id, parsed.data);
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
