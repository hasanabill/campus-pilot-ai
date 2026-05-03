import { Model, Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import Department from "@/models/Department";
import Faculty from "@/models/Faculty";
import LabResource from "@/models/LabResource";
import Room from "@/models/Room";
import Student from "@/models/Student";

type AppRole = "student" | "faculty" | "admin" | "registrar";
type Resource = "departments" | "students" | "faculty" | "courses" | "rooms" | "lab-resources";

const resourceNames = ["departments", "students", "faculty", "courses", "rooms", "lab-resources"] as const;

export const resourceSchema = z.enum(resourceNames);

export const listMasterDataQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  page: z.number().int().min(1).optional(),
});

const objectIdString = z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid ObjectId.");

const createSchemas = {
  departments: z.object({
    name: z.string().min(2).max(200),
    code: z.string().min(2).max(30),
    office_email: z.email(),
    office_phone: z.string().max(40).optional().nullable(),
  }),
  students: z.object({
    user_id: objectIdString,
    student_id: z.string().min(2).max(80),
    program: z.string().min(2).max(120),
    semester: z.number().int().min(1),
    batch: z.string().min(1).max(40),
  }),
  faculty: z.object({
    user_id: objectIdString,
    employee_id: z.string().min(2).max(80),
    designation: z.string().min(2).max(120),
    specialization: z.string().max(200).optional().nullable(),
    workload_limit: z.number().min(0).optional().default(0),
  }),
  courses: z.object({
    name: z.string().min(2).max(200),
    code: z.string().min(2).max(30),
    department_id: objectIdString,
    credits: z.number().min(0),
    prerequisites: z.array(z.string()).optional().default([]),
    syllabus_url: z.url().optional().nullable(),
  }),
  rooms: z.object({
    room_code: z.string().min(1).max(40),
    building: z.string().min(1).max(120),
    capacity: z.number().int().min(1),
    room_type: z.enum(["classroom", "lab", "exam_hall"]),
    is_active: z.boolean().optional().default(true),
  }),
  "lab-resources": z.object({
    name: z.string().min(2).max(200),
    resource_type: z.string().min(2).max(120),
    quantity: z.number().int().min(0),
    lab_room_id: objectIdString,
    is_active: z.boolean().optional().default(true),
  }),
} satisfies Record<Resource, z.ZodType>;

const modelMap: Record<Resource, Model<unknown>> = {
  departments: Department,
  students: Student,
  faculty: Faculty,
  courses: Course,
  rooms: Room,
  "lab-resources": LabResource,
};

function canManageMasterData(role: AppRole): boolean {
  return role === "admin";
}

function toObjectIds(resource: Resource, payload: Record<string, unknown>) {
  const next = { ...payload };
  for (const key of ["user_id", "department_id", "lab_room_id"]) {
    if (typeof next[key] === "string") next[key] = new Types.ObjectId(next[key] as string);
  }
  return next;
}

export async function listMasterData(resource: Resource, query: z.infer<typeof listMasterDataQuerySchema>) {
  resourceSchema.parse(resource);
  const parsed = listMasterDataQuerySchema.parse(query);
  await connectToDatabase();

  const limit = parsed.limit ?? 20;
  const page = parsed.page ?? 1;
  const skip = (page - 1) * limit;
  const ModelRef = modelMap[resource];

  const [items, total] = await Promise.all([
    ModelRef.find({}).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    ModelRef.countDocuments({}),
  ]);

  return { items, total, page, limit, total_pages: Math.ceil(total / limit) };
}

export async function createMasterData(
  requester: { role: AppRole },
  resource: Resource,
  payload: unknown,
) {
  if (!canManageMasterData(requester.role)) throw new Error("Only admin can manage master data.");
  resourceSchema.parse(resource);
  const parsed = createSchemas[resource].parse(payload) as Record<string, unknown>;
  await connectToDatabase();
  const item = await modelMap[resource].create(toObjectIds(resource, parsed));
  return item.toObject();
}

export async function updateMasterData(
  requester: { role: AppRole },
  resource: Resource,
  id: string,
  payload: unknown,
) {
  if (!canManageMasterData(requester.role)) throw new Error("Only admin can manage master data.");
  resourceSchema.parse(resource);
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid item id.");
  const parsed = createSchemas[resource].partial().parse(payload) as Record<string, unknown>;
  await connectToDatabase();
  return modelMap[resource]
    .findByIdAndUpdate(id, toObjectIds(resource, parsed), { new: true, runValidators: true })
    .lean();
}

export async function deleteMasterData(requester: { role: AppRole }, resource: Resource, id: string) {
  if (!canManageMasterData(requester.role)) throw new Error("Only admin can manage master data.");
  resourceSchema.parse(resource);
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid item id.");
  await connectToDatabase();
  return modelMap[resource].findByIdAndDelete(id).lean();
}
