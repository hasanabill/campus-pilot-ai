import { model, models, Schema } from "mongoose";

const documentTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["certificate", "recommendation_letter", "notice", "report", "meeting_minutes"],
      required: true,
    },
    template_body: { type: String, required: true },
    placeholders: { type: [String], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

documentTemplateSchema.index({ type: 1, is_active: 1 });

const DocumentTemplate =
  models.DocumentTemplate ?? model("DocumentTemplate", documentTemplateSchema);

export default DocumentTemplate;
