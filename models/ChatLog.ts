import { model, models, Schema } from "mongoose";

const chatLogSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    session_id: { type: String, required: true, trim: true },
    query: { type: String, required: true },
    response: { type: String, required: true },
    matched_chunk_ids: [
      { type: Schema.Types.ObjectId, ref: "KnowledgeBaseChunk" },
    ],
    confidence_score: { type: Number, min: 0, max: 1, default: null },
    routed_to_ticket_id: { type: Schema.Types.ObjectId, ref: "Ticket", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

chatLogSchema.index({ user_id: 1, session_id: 1, created_at: -1 });

const ChatLog = models.ChatLog ?? model("ChatLog", chatLogSchema);

export default ChatLog;
