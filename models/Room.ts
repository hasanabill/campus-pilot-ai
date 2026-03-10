import { model, models, Schema } from "mongoose";

const roomSchema = new Schema(
  {
    room_code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    building: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    room_type: {
      type: String,
      enum: ["classroom", "lab", "exam_hall"],
      required: true,
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

roomSchema.index({ room_code: 1 }, { unique: true });

const Room = models.Room ?? model("Room", roomSchema);

export default Room;
