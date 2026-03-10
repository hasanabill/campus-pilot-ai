import { model, models, Schema } from "mongoose";

const workflowTaskSchema = new Schema(
  {
    entity_type: { type: String, enum: ["ticket", "document", "schedule", "approval"], required: true },
    entity_id: { type: Schema.Types.ObjectId, required: true },
    task_type: { type: String, required: true, trim: true },
    assigned_to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    due_date: { type: Date, default: null },
    status: { type: String, enum: ["pending", "in_progress", "completed", "cancelled"], default: "pending" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

workflowTaskSchema.index({ assigned_to: 1, status: 1, due_date: 1 });
workflowTaskSchema.index({ entity_type: 1, entity_id: 1 });

const WorkflowTask = models.WorkflowTask ?? model("WorkflowTask", workflowTaskSchema);

export default WorkflowTask;
