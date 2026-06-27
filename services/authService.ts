import bcrypt from "bcryptjs";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Department from "@/models/Department";
import Faculty from "@/models/Faculty";
import Student from "@/models/Student";
import User, { USER_ROLES, type UserRole } from "@/models/User";
import {
  buildDefaultPublicUserId,
  ensurePublicUserIdForUser,
  normalizePublicUserId,
} from "@/services/userIdentityService";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(USER_ROLES).optional().default("student"),
  public_user_id: z.string().max(80).optional().nullable(),
  department_id: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  student_id: z.string().max(50).optional(),
  program: z.string().max(150).optional(),
  semester: z.number().int().min(1).max(20).optional(),
  batch: z.string().max(30).optional(),
  employee_id: z.string().max(50).optional(),
  designation: z.string().max(120).optional(),
  specialization: z.string().max(200).optional().nullable(),
  workload_limit: z.number().min(0).optional(),
}).superRefine((value, ctx) => {
  if ((value.role === "student" || value.role === "faculty") && !value.department_id?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["department_id"],
      message: "Department is required for student and faculty accounts.",
    });
  }
  if (value.role === "student") {
    if (!value.student_id || !value.student_id.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["student_id"],
        message: "Student ID is required when role is student.",
      });
    }
    if (!value.program || !value.program.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["program"],
        message: "Program is required when role is student.",
      });
    }
    if (!value.batch || !value.batch.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["batch"],
        message: "Batch is required when role is student.",
      });
    }
  }
  if (value.role === "faculty") {
    if (!value.employee_id || !value.employee_id.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["employee_id"],
        message: "Faculty ID (employee_id) is required when role is faculty.",
      });
    }
    if (!value.designation || !value.designation.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["designation"],
        message: "Designation is required when role is faculty.",
      });
    }
  }
});

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type SafeUser = {
  id: string;
  public_user_id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  phone: string | null;
  is_active: boolean;
};

function toSafeUser(user: {
  _id: string;
  public_user_id?: string | null;
  name: string;
  email: string;
  role: UserRole;
  department_id?: string | null;
  phone?: string | null;
  is_active?: boolean;
}): SafeUser {
  return {
    id: String(user._id),
    public_user_id: user.public_user_id ?? "",
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

function buildFacultyProfileDefaults(parsed: z.infer<typeof registerSchema>) {
  return {
    employee_id: parsed.employee_id!.trim(),
    designation: parsed.designation!.trim(),
    specialization: parsed.specialization ?? null,
    workload_limit: parsed.workload_limit ?? 0,
  };
}

async function assertDepartmentExists(departmentId: string | null | undefined) {
  if (!departmentId) return;
  const department = await Department.findById(departmentId).select("_id").lean();
  if (!department) {
    throw new Error("Selected department was not found.");
  }
}

export async function registerUser(payload: z.infer<typeof registerSchema>): Promise<SafeUser> {
  const parsed = registerSchema.parse(payload);
  await connectToDatabase();
  await assertDepartmentExists(parsed.department_id);
  const normalizedPublicUserId = parsed.public_user_id
    ? normalizePublicUserId(parsed.public_user_id)
    : null;

  const existing = await User.findOne({ email: parsed.email.toLowerCase() }).lean();
  if (existing) {
    throw new Error("User already exists with this email.");
  }
  if (normalizedPublicUserId) {
    const existingPublicId = await User.collection.findOne(
      { public_user_id: normalizedPublicUserId },
      { projection: { _id: 1 } },
    );
    if (existingPublicId) {
      throw new Error("User ID already exists. Please use a different user ID.");
    }
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  let created;
  try {
    created = await User.create({
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      password_hash: passwordHash,
      role: parsed.role,
      public_user_id: normalizedPublicUserId,
      department_id: parsed.department_id ?? null,
      phone: parsed.phone ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("E11000") && message.includes("public_user_id")) {
      throw new Error("User ID already exists. Please use a different user ID.");
    }
    throw error;
  }

  const finalPublicUserId =
    normalizedPublicUserId ?? buildDefaultPublicUserId(created.role, String(created._id));
  await User.collection.updateOne(
    { _id: created._id },
    { $set: { public_user_id: finalPublicUserId } },
  );

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

  if (parsed.role === "faculty") {
    const profile = buildFacultyProfileDefaults(parsed);
    try {
      await Faculty.create({
        user_id: created._id,
        employee_id: profile.employee_id,
        designation: profile.designation,
        specialization: profile.specialization,
        workload_limit: profile.workload_limit,
      });
    } catch {
      await User.findByIdAndDelete(created._id);
      throw new Error(
        "Faculty profile creation failed. Please provide unique employee details and try again.",
      );
    }
  }

  return toSafeUser({
    _id: String(created._id),
    public_user_id: finalPublicUserId,
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

  const publicUserId =
    typeof user.public_user_id === "string" && user.public_user_id.trim()
      ? user.public_user_id
      : await ensurePublicUserIdForUser(String(user._id));

  return toSafeUser({
    _id: String(user._id),
    public_user_id: publicUserId,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    department_id: user.department_id ?? null,
    phone: user.phone ?? null,
    is_active: user.is_active ?? true,
  });
}
