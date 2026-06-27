import { model, models, Schema } from "mongoose";

const generatedRoutineSchema = new Schema(
  {
    department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    semester: { type: String, required: true, trim: true },
    status: { type: String, enum: ["draft", "applied", "rejected"], default: "draft" },
    score: { type: Number, default: 0 },
    violations: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    ai_summary: { type: String, default: null },
    generated_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

generatedRoutineSchema.index({ department_id: 1, semester: 1, status: 1, created_at: -1 });
generatedRoutineSchema.index({ generated_by: 1, created_at: -1 });

const GeneratedRoutine = models.GeneratedRoutine ?? model("GeneratedRoutine", generatedRoutineSchema);

export default GeneratedRoutine;
