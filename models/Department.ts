import { model, models, Schema } from "mongoose";

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    office_email: { type: String, required: true, lowercase: true, trim: true },
    office_phone: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

departmentSchema.index({ code: 1 }, { unique: true });
departmentSchema.index({ name: 1 });

const Department = models.Department ?? model("Department", departmentSchema);

export default Department;
