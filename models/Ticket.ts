import { model, models, Schema } from "mongoose";

const ticketSchema = new Schema(
  {
    student_id: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["certificate", "transcript", "correction", "permission", "internship", "other"],
      required: true,
    },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: {
      type: String,
      enum: ["pending", "in_review", "approved", "rejected", "completed", "escalated"],
      default: "pending",
    },
    assigned_to: { type: Schema.Types.ObjectId, ref: "User", default: null },
    escalation_level: { type: Number, min: 0, default: 0 },
    due_date: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

ticketSchema.index({ student_id: 1, created_at: -1 });
ticketSchema.index({ status: 1, assigned_to: 1 });
ticketSchema.index({ type: 1, priority: 1 });

const Ticket = models.Ticket ?? model("Ticket", ticketSchema);

export default Ticket;
