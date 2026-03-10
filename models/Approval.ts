import { model, models, Schema } from "mongoose";

const approvalSchema = new Schema(
  {
    entity_type: {
      type: String,
      enum: ["ticket", "generated_document", "schedule_change"],
      required: true,
    },
    entity_id: { type: Schema.Types.ObjectId, required: true },
    stage: { type: String, enum: ["admin_review", "faculty_review", "registrar_final"], required: true },
    approver_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    decision: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    comments: { type: String, default: null },
    decided_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

approvalSchema.index({ entity_type: 1, entity_id: 1 });
approvalSchema.index({ approver_id: 1, decision: 1, stage: 1 });

const Approval = models.Approval ?? model("Approval", approvalSchema);

export default Approval;
