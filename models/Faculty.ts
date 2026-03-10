import { model, models, Schema } from "mongoose";

const facultySchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employee_id: { type: String, required: true, unique: true, trim: true },
    designation: { type: String, required: true, trim: true },
    specialization: { type: String, default: null },
    workload_limit: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

facultySchema.index({ employee_id: 1 }, { unique: true });
facultySchema.index({ user_id: 1 }, { unique: true });

const Faculty = models.Faculty ?? model("Faculty", facultySchema);

export default Faculty;
