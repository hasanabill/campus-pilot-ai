import { model, models, Schema } from "mongoose";

const knowledgeBaseChunkSchema = new Schema(
  {
    document_id: { type: Schema.Types.ObjectId, ref: "KnowledgeBaseDocument", required: true },
    chunk_index: { type: Number, required: true, min: 0 },
    chunk_text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    token_count: { type: Number, required: true, min: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

knowledgeBaseChunkSchema.index({ document_id: 1, chunk_index: 1 });

const KnowledgeBaseChunk =
  models.KnowledgeBaseChunk ?? model("KnowledgeBaseChunk", knowledgeBaseChunkSchema);

export default KnowledgeBaseChunk;
