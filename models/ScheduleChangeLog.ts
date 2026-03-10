import { model, models, Schema } from "mongoose";

const scheduleChangeLogSchema = new Schema(
  {
    schedule_id: { type: Schema.Types.ObjectId, ref: "Schedule", required: true },
    reason: {
      type: String,
      enum: ["faculty_unavailable", "holiday", "emergency", "optimization", "conflict_fix"],
      required: true,
    },
    old_slot: { type: Schema.Types.Mixed, required: true },
    new_slot: { type: Schema.Types.Mixed, required: true },
    changed_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

scheduleChangeLogSchema.index({ schedule_id: 1, created_at: -1 });

const ScheduleChangeLog =
  models.ScheduleChangeLog ?? model("ScheduleChangeLog", scheduleChangeLogSchema);

export default ScheduleChangeLog;
