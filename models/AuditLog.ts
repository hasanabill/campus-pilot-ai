import { model, models, Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    actor_id: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actor_role: { type: String, enum: ["student", "faculty", "admin", "registrar", "system"], required: true },
    action: {
      type: String,
      enum: ["create", "update", "delete", "login", "logout", "approve", "reject", "upload", "download", "export"],
      required: true,
    },
    entity_type: {
      type: String,
      enum: ["user", "ticket", "generated_document", "schedule", "approval", "knowledge_base_document", "report", "notification"],
      required: true,
    },
    entity_id: { type: Schema.Types.ObjectId, required: true },
    before_state: { type: Schema.Types.Mixed, default: null },
    after_state: { type: Schema.Types.Mixed, default: null },
    metadata: {
      ip_address: { type: String, default: null },
      user_agent: { type: String, default: null },
      request_id: { type: String, default: null },
      source_module: { type: String, default: null },
    },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ action: 1, entity_type: 1, entity_id: 1 });
auditLogSchema.index({ severity: 1, created_at: -1 });

const AuditLog = models.AuditLog ?? model("AuditLog", auditLogSchema);

export default AuditLog;
