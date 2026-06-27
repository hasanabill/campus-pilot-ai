import { model, models, Schema } from "mongoose";

const routineCourseAssignmentSchema = new Schema(
  {
    section_id: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    faculty_id: { type: Schema.Types.ObjectId, ref: "Faculty", required: true },
    weekly_classes: { type: Number, min: 1, max: 6, default: 2 },
    class_duration_minutes: { type: Number, min: 30, max: 180, default: 60 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

routineCourseAssignmentSchema.index({ section_id: 1, course_id: 1 }, { unique: true });
routineCourseAssignmentSchema.index({ faculty_id: 1, is_active: 1 });

const RoutineCourseAssignment =
  models.RoutineCourseAssignment ?? model("RoutineCourseAssignment", routineCourseAssignmentSchema);

export default RoutineCourseAssignment;
