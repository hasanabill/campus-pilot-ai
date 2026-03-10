import { model, models, Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    channel: { type: String, enum: ["in_app", "email"], default: "in_app" },
    type: {
      type: String,
      enum: ["ticket_update", "schedule_update", "approval_required", "announcement", "reminder"],
      required: true,
    },
    message: { type: String, required: true },
    reference_type: { type: String, default: null },
    reference_id: { type: Schema.Types.ObjectId, default: null },
    is_read: { type: Boolean, default: false },
    sent_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

const Notification = models.Notification ?? model("Notification", notificationSchema);

export default Notification;
