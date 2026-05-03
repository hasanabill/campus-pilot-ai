import { model, models, Schema } from "mongoose";

const generatedDocumentSchema = new Schema(
  {
    template_id: { type: Schema.Types.ObjectId, ref: "DocumentTemplate", default: null },
    requested_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    related_ticket_id: { type: Schema.Types.ObjectId, ref: "Ticket", default: null },
    ai_prompt_snapshot: { type: String, required: true },
    generated_text: { type: String, required: true },
    cloudinary_url: { type: String, required: true },
    public_id: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected", "issued"],
      default: "draft",
    },
    approved_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

generatedDocumentSchema.index({ status: 1, requested_by: 1 });
generatedDocumentSchema.index({ related_ticket_id: 1 });

const GeneratedDocument =
  models.GeneratedDocument ?? model("GeneratedDocument", generatedDocumentSchema);

export default GeneratedDocument;
