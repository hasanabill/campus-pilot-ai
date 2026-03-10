import { model, models, Schema } from "mongoose";

const knowledgeBaseDocumentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["syllabus", "regulation", "internship", "notice", "handbook", "guideline"],
      required: true,
    },
    source_type: { type: String, enum: ["pdf", "docx", "text"], required: true },
    cloudinary_url: { type: String, required: true },
    public_id: { type: String, required: true },
    uploaded_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

knowledgeBaseDocumentSchema.index({ department_id: 1, category: 1 });

const KnowledgeBaseDocument =
  models.KnowledgeBaseDocument ?? model("KnowledgeBaseDocument", knowledgeBaseDocumentSchema);

export default KnowledgeBaseDocument;
