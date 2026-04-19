import bcrypt from "bcryptjs";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Student from "@/models/Student";
import User, { USER_ROLES, type UserRole } from "@/models/User";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(USER_ROLES).optional().default("student"),
  department_id: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  student_id: z.string().max(50).optional(),
  program: z.string().max(150).optional(),
  semester: z.number().int().min(1).max(20).optional(),
  batch: z.string().max(30).optional(),
});

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  phone: string | null;
  is_active: boolean;
};

function toSafeUser(user: {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id?: string | null;
  phone?: string | null;
  is_active?: boolean;
}): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: user.department_id ?? null,
    phone: user.phone ?? null,
    is_active: user.is_active ?? true,
  };
}

function buildStudentProfileDefaults(parsed: z.infer<typeof registerSchema>, userId: string) {
  return {
    student_id:
      parsed.student_id ??
      `STU-${new Date().getFullYear()}-${userId.slice(-6).toUpperCase()}`,
    program: parsed.program ?? "Undeclared Program",
    semester: parsed.semester ?? 1,
    batch: parsed.batch ?? `${new Date().getFullYear()}`,
  };
}

export async function registerUser(payload: z.infer<typeof registerSchema>): Promise<SafeUser> {
  const parsed = registerSchema.parse(payload);
  await connectToDatabase();

  const existing = await User.findOne({ email: parsed.email.toLowerCase() }).lean();
  if (existing) {
    throw new Error("User already exists with this email.");
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  const created = await User.create({
    name: parsed.name,
    email: parsed.email.toLowerCase(),
    password_hash: passwordHash,
    role: parsed.role,
    department_id: parsed.department_id ?? null,
    phone: parsed.phone ?? null,
  });

  if (parsed.role === "student") {
    const profile = buildStudentProfileDefaults(parsed, String(created._id));
    try {
      await Student.create({
        user_id: created._id,
        student_id: profile.student_id,
        program: profile.program,
        semester: profile.semester,
        batch: profile.batch,
      });
    } catch {
      await User.findByIdAndDelete(created._id);
      throw new Error(
        "Student profile creation failed. Please provide unique student details and try again.",
      );
    }
  }

  return toSafeUser({
    _id: String(created._id),
    name: created.name,
    email: created.email,
    role: created.role,
    department_id: created.department_id,
    phone: created.phone,
    is_active: created.is_active,
  });
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SafeUser | null> {
  const parsed = credentialsSchema.parse({ email, password });
  await connectToDatabase();

  const user = await User.findOne({ email: parsed.email.toLowerCase() })
    .select("+password_hash")
    .lean();

  if (!user || typeof user.password_hash !== "string" || user.is_active === false) {
    return null;
  }

  const isMatch = await bcrypt.compare(parsed.password, user.password_hash);
  if (!isMatch) {
    return null;
  }

  return toSafeUser({
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    department_id: user.department_id ?? null,
    phone: user.phone ?? null,
    is_active: user.is_active ?? true,
  });
}
