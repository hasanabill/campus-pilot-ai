import { model, models, Schema } from "mongoose";

const studentSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    student_id: { type: String, required: true, unique: true, trim: true },
    program: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1 },
    batch: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

studentSchema.index({ student_id: 1 }, { unique: true });
studentSchema.index({ user_id: 1 }, { unique: true });

const Student = models.Student ?? model("Student", studentSchema);

export default Student;
