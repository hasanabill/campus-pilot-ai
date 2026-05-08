import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import User, { type UserRole } from "@/models/User";
import { ensurePublicUserIdForUser } from "@/services/userIdentityService";

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  department_id: z.string().max(100).optional().nullable(),
});

export type UserProfile = {
  id: string;
  public_user_id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at?: Date | string;
};

function toProfile(user: {
  _id: Types.ObjectId | string;
  public_user_id?: string | null;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  department_id?: string | null;
  is_active?: boolean;
  created_at?: Date | string;
}): UserProfile {
  return {
    id: String(user._id),
    public_user_id: user.public_user_id ?? "",
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    department_id: user.department_id ?? null,
    is_active: user.is_active ?? true,
    created_at: user.created_at,
  };
}

export async function getProfile(userId: string): Promise<UserProfile> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id.");
  }
  await connectToDatabase();
  const user = (await User.collection.findOne(
    { _id: new Types.ObjectId(userId) },
    {
      projection: {
        _id: 1,
        public_user_id: 1,
        name: 1,
        email: 1,
        role: 1,
        phone: 1,
        department_id: 1,
        is_active: 1,
        created_at: 1,
      },
    },
  )) as {
    _id: Types.ObjectId;
    public_user_id?: string | null;
    name: string;
    email: string;
    role: UserRole;
    phone?: string | null;
    department_id?: string | null;
    is_active?: boolean;
    created_at?: Date | string;
  } | null;

  if (!user) {
    throw new Error("User not found.");
  }

  const publicUserId =
    user.public_user_id && user.public_user_id.trim()
      ? user.public_user_id
      : await ensurePublicUserIdForUser(String(user._id));
  return toProfile({ ...user, public_user_id: publicUserId });
}

export async function updateProfile(userId: string, payload: z.infer<typeof updateProfileSchema>): Promise<UserProfile> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id.");
  }
  const parsed = updateProfileSchema.parse(payload);
  await connectToDatabase();
  await User.collection.updateOne(
    { _id: new Types.ObjectId(userId) },
    {
      $set: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.phone !== undefined ? { phone: parsed.phone ?? null } : {}),
        ...(parsed.department_id !== undefined ? { department_id: parsed.department_id ?? null } : {}),
      },
    },
  );
  const updated = (await User.collection.findOne(
    { _id: new Types.ObjectId(userId) },
    {
      projection: {
        _id: 1,
        public_user_id: 1,
        name: 1,
        email: 1,
        role: 1,
        phone: 1,
        department_id: 1,
        is_active: 1,
        created_at: 1,
      },
    },
  )) as {
    _id: Types.ObjectId;
    public_user_id?: string | null;
    name: string;
    email: string;
    role: UserRole;
    phone?: string | null;
    department_id?: string | null;
    is_active?: boolean;
    created_at?: Date | string;
  } | null;

  if (!updated) {
    throw new Error("User not found.");
  }

  const publicUserId =
    updated.public_user_id && updated.public_user_id.trim()
      ? updated.public_user_id
      : await ensurePublicUserIdForUser(String(updated._id));
  return toProfile({ ...updated, public_user_id: publicUserId });
}
