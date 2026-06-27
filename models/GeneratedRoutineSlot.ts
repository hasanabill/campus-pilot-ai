import { model, models, Schema } from "mongoose";

const generatedRoutineSlotSchema = new Schema(
  {
    routine_id: { type: Schema.Types.ObjectId, ref: "GeneratedRoutine", required: true },
    batch_id: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    section_id: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    course_id: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    faculty_id: { type: Schema.Types.ObjectId, ref: "Faculty", required: true },
    room_id: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    batch_name: { type: String, required: true, trim: true },
    section_name: { type: String, required: true, trim: true },
    course_code: { type: String, default: null },
    course_name: { type: String, default: null },
    faculty_name: { type: String, default: null },
    room_code: { type: String, default: null },
    day: { type: String, required: true, trim: true },
    start_time: { type: String, required: true, trim: true },
    end_time: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

generatedRoutineSlotSchema.index({ routine_id: 1, batch_name: 1, section_name: 1, day: 1 });
generatedRoutineSlotSchema.index({ faculty_id: 1, day: 1, start_time: 1 });
generatedRoutineSlotSchema.index({ room_id: 1, day: 1, start_time: 1 });

const GeneratedRoutineSlot =
  models.GeneratedRoutineSlot ?? model("GeneratedRoutineSlot", generatedRoutineSlotSchema);

export default GeneratedRoutineSlot;
