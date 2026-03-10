import { model, models, Schema } from "mongoose";

const courseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    credits: { type: Number, required: true, min: 0 },
    prerequisites: { type: [String], default: [] },
    syllabus_url: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

courseSchema.index({ code: 1 }, { unique: true });
courseSchema.index({ department_id: 1 });

const Course = models.Course ?? model("Course", courseSchema);

export default Course;
