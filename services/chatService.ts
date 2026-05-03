import { Types } from "mongoose";
import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import ChatLog from "@/models/ChatLog";
import { findFaqAnswer } from "@/services/faqService";
import { generateChatResponse } from "@/services/aiService";
import { createTicket } from "@/services/ticketService";

const chatHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const createChatRequestSchema = z.object({
  question: z.string().min(2),
  session_id: z.string().min(3).max(120).optional(),
  topK: z.number().int().min(1).max(20).optional(),
  history: z.array(chatHistoryItemSchema).max(20).optional(),
  create_ticket: z.boolean().optional().default(false),
});

type CreateChatInput = z.infer<typeof createChatRequestSchema> & {
  user_id: string;
  role?: "student" | "faculty" | "admin" | "registrar";
  department_id?: string | null;
};

export async function createChatResponseAndLog(input: CreateChatInput) {
  const parsed = createChatRequestSchema.parse(input);

  if (!Types.ObjectId.isValid(input.user_id)) {
    throw new Error("Invalid user id for chat logging.");
  }

  await connectToDatabase();

  const faqMatch = await findFaqAnswer(parsed.question);
  const result = faqMatch
    ? {
        answer: faqMatch.answer,
        context: [],
      }
    : await generateChatResponse(parsed.question, {
        topK: parsed.topK,
        history: parsed.history,
        departmentId: input.department_id ?? undefined,
      });

  const matchedChunkIds = result.context
    .map((item) => item.chunkId)
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const maxScore =
    result.context.length > 0 ? Math.max(...result.context.map((item) => item.score)) : null;

  const sessionId =
    parsed.session_id ??
    `s_${input.user_id.slice(-6)}_${Date.now().toString(36)}`;

  let routedTicketId: Types.ObjectId | null = null;
  if (parsed.create_ticket) {
    if (input.role !== "student") {
      throw new Error("Only students can create tickets from chat.");
    }
    const ticket = await createTicket(
      { userId: input.user_id, role: input.role },
      {
        title: parsed.question.slice(0, 120),
        description: `Created from AI chat query:\n\n${parsed.question}`,
        type: "other",
        priority: "medium",
      },
    );
    routedTicketId = new Types.ObjectId(String(ticket._id));
  }

  await ChatLog.create({
    user_id: new Types.ObjectId(input.user_id),
    session_id: sessionId,
    query: parsed.question,
    response: result.answer,
    matched_chunk_ids: matchedChunkIds,
    confidence_score: maxScore,
    routed_to_ticket_id: routedTicketId,
  });

  return {
    answer: result.answer,
    session_id: sessionId,
    context: result.context,
    routed_to_ticket_id: routedTicketId ? String(routedTicketId) : null,
    source: faqMatch ? "faq" : "knowledge_base",
  };
}
