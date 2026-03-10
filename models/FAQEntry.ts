import { model, models, Schema } from "mongoose";

const faqEntrySchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    source_document_id: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgeBaseDocument",
      default: null,
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

faqEntrySchema.index({ category: 1, is_active: 1 });

const FAQEntry = models.FAQEntry ?? model("FAQEntry", faqEntrySchema);

export default FAQEntry;
