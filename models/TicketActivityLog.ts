import { model, models, Schema } from "mongoose";

const ticketActivityLogSchema = new Schema(
  {
    ticket_id: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    actor_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: ["created", "assigned", "status_changed", "escalated", "commented", "closed"],
      required: true,
    },
    old_value: { type: Schema.Types.Mixed, default: null },
    new_value: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

ticketActivityLogSchema.index({ ticket_id: 1, created_at: -1 });

const TicketActivityLog =
  models.TicketActivityLog ?? model("TicketActivityLog", ticketActivityLogSchema);

export default TicketActivityLog;
