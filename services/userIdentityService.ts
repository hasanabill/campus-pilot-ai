import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import Student from "@/models/Student";
import User, { type UserRole } from "@/models/User";

const rolePrefix: Record<UserRole, string> = {
  student: "STU",
  faculty: "FAC",
  admin: "ADM",
  registrar: "REG",
};

export function normalizePublicUserId(value: string): string {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

export function buildDefaultPublicUserId(role: UserRole, userId: string): string {
  return `${rolePrefix[role]}-${userId.slice(-6).toUpperCase()}`;
}

export async function ensurePublicUserIdForUser(userId: string): Promise<string> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id.");
  }

  await connectToDatabase();
  const user = await User.collection.findOne(
    { _id: new Types.ObjectId(userId) },
    { projection: { _id: 1, role: 1, public_user_id: 1 } },
  ) as { _id: Types.ObjectId; role: UserRole; public_user_id?: string | null } | null;

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.public_user_id?.trim()) {
    return user.public_user_id;
  }

  const generated = buildDefaultPublicUserId(user.role, String(user._id));
  await User.collection.updateOne(
    { _id: user._id },
    { $set: { public_user_id: generated } },
  );
  return generated;
}

export async function resolveUserObjectId(identifier: string, fieldName = "user identifier"): Promise<Types.ObjectId> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  if (Types.ObjectId.isValid(trimmed)) {
    return new Types.ObjectId(trimmed);
  }

  await connectToDatabase();
  const normalizedPublicId = normalizePublicUserId(trimmed);
  const email = trimmed.toLowerCase();

  const user = await User.collection.findOne(
    {
      $or: [{ public_user_id: normalizedPublicId }, { email }],
    },
    { projection: { _id: 1 } },
  ) as { _id: Types.ObjectId } | null;

  if (user) {
    return user._id;
  }

  const student = await Student.findOne({ student_id: trimmed })
    .select("user_id")
    .lean<{ user_id: Types.ObjectId } | null>();
  if (student?.user_id) {
    return student.user_id;
  }

  const faculty = await Faculty.findOne({ employee_id: trimmed })
    .select("user_id")
    .lean<{ user_id: Types.ObjectId } | null>();
  if (faculty?.user_id) {
    return faculty.user_id;
  }

  if (/^(STU|FAC|ADM|REG)-[A-Z0-9]+$/i.test(normalizedPublicId)) {
    const allUsers = (await User.collection
      .find({}, { projection: { _id: 1, role: 1 } })
      .toArray()) as Array<{ _id: Types.ObjectId; role: UserRole }>;

    const match = allUsers.find(
      (item) => buildDefaultPublicUserId(item.role, String(item._id)) === normalizedPublicId,
    );
    if (match) {
      await User.collection.updateOne(
        { _id: match._id },
        { $set: { public_user_id: normalizedPublicId } },
      );
      return match._id;
    }
  }

  throw new Error(
    `Invalid ${fieldName}. Use a public user ID (e.g. STU-XXXXXX), email, student/faculty profile ID, or MongoDB _id.`,
  );
}

export async function mapObjectIdsToPublicUserIds(
  userIds: string[],
): Promise<Record<string, string>> {
  const validIds = Array.from(new Set(userIds.filter((id) => Types.ObjectId.isValid(id))));
  if (validIds.length === 0) {
    return {};
  }

  await connectToDatabase();
  const users = (await User.collection
    .find(
      { _id: { $in: validIds.map((id) => new Types.ObjectId(id)) } },
      { projection: { _id: 1, role: 1, public_user_id: 1 } },
    )
    .toArray()) as Array<{ _id: Types.ObjectId; role: UserRole; public_user_id?: string | null }>;

  const map: Record<string, string> = {};
  for (const user of users) {
    const id = String(user._id);
    map[id] =
      user.public_user_id && user.public_user_id.trim()
        ? user.public_user_id
        : await ensurePublicUserIdForUser(id);
  }
  return map;
}
