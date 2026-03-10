import { model, models, Schema } from "mongoose";

const departmentNoticeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    audience: { type: String, enum: ["students", "faculty", "all"], default: "all" },
    department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    published_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    published_at: { type: Date, required: true },
    expires_at: { type: Date, default: null },
  },
  { timestamps: false },
);

departmentNoticeSchema.index({ department_id: 1, published_at: -1 });

const DepartmentNotice =
  models.DepartmentNotice ?? model("DepartmentNotice", departmentNoticeSchema);

export default DepartmentNotice;
