import { model, models, Schema } from "mongoose";

const scheduleSchema = new Schema(
  {
    schedule_type: { type: String, enum: ["class", "exam"], required: true },
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    faculty_id: { type: Schema.Types.ObjectId, ref: "Faculty", required: true },
    room_id: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    day: { type: String, required: true },
    date: { type: Date, default: null },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true },
    status: { type: String, enum: ["draft", "published", "updated", "cancelled"], default: "draft" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

scheduleSchema.index({ room_id: 1, day: 1, start_time: 1, end_time: 1 });
scheduleSchema.index({ faculty_id: 1, day: 1, start_time: 1, end_time: 1 });

const Schedule = models.Schedule ?? model("Schedule", scheduleSchema);

export default Schedule;
