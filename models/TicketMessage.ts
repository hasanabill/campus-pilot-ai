import { model, models, Schema } from "mongoose";

const ticketMessageSchema = new Schema(
  {
    ticket_id: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender_role: { type: String, enum: ["student", "faculty", "admin", "registrar"], required: true },
    message: { type: String, required: true },
    attachment_urls: { type: [String], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

ticketMessageSchema.index({ ticket_id: 1, created_at: 1 });

const TicketMessage = models.TicketMessage ?? model("TicketMessage", ticketMessageSchema);

export default TicketMessage;
