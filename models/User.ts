import { model, models, Schema, type InferSchemaType } from "mongoose";

export const USER_ROLES = ["student", "faculty", "admin", "registrar"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "student" },
    department_id: { type: String, default: null },
    phone: { type: String, default: null },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ department_id: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };

const User = models.User ?? model("User", userSchema);

export default User;
