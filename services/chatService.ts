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

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

function getPersistentSessionId(userId: string): string {
  return `u_${userId}`;
}

function buildHistoryFromLogs(
  logs: Array<{ query: string; response: string }>,
  maxMessages = 20,
): ChatHistoryMessage[] {
  const messages: ChatHistoryMessage[] = [];
  for (const log of logs) {
    if (log.query?.trim()) messages.push({ role: "user", content: log.query });
    if (log.response?.trim()) messages.push({ role: "assistant", content: log.response });
  }
  return messages.slice(-maxMessages);
}

export async function getChatSessionForUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id for chat session.");
  }

  await connectToDatabase();
  const sessionId = getPersistentSessionId(userId);
  const logs = await ChatLog.find({
    user_id: new Types.ObjectId(userId),
    session_id: sessionId,
  })
    .select("query response")
    .sort({ created_at: 1 })
    .lean<Array<{ query: string; response: string }>>();

  return {
    session_id: sessionId,
    messages: buildHistoryFromLogs(logs),
  };
}

export async function clearChatSessionForUser(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user id for chat session.");
  }
  await connectToDatabase();
  const sessionId = getPersistentSessionId(userId);
  await ChatLog.deleteMany({
    user_id: new Types.ObjectId(userId),
    session_id: sessionId,
  });
  return { session_id: sessionId, cleared: true as const };
}

export async function createChatResponseAndLog(input: CreateChatInput) {
  const parsed = createChatRequestSchema.parse(input);

  if (!Types.ObjectId.isValid(input.user_id)) {
    throw new Error("Invalid user id for chat logging.");
  }

  await connectToDatabase();

  const sessionId = getPersistentSessionId(input.user_id);
  const priorLogs = await ChatLog.find({
    user_id: new Types.ObjectId(input.user_id),
    session_id: sessionId,
  })
    .select("query response")
    .sort({ created_at: -1 })
    .limit(10)
    .lean<Array<{ query: string; response: string }>>();
  const persistedHistory = buildHistoryFromLogs([...priorLogs].reverse());
  const effectiveHistory = persistedHistory.length > 0 ? persistedHistory : parsed.history;

  const faqMatch = await findFaqAnswer(parsed.question);
  const result = faqMatch
    ? {
        answer: faqMatch.answer,
        context: [],
      }
    : await generateChatResponse(parsed.question, {
        topK: parsed.topK,
        history: effectiveHistory,
        departmentId: input.department_id ?? undefined,
      });

  const matchedChunkIds = result.context
    .map((item) => item.chunkId)
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const maxScore =
    result.context.length > 0 ? Math.max(...result.context.map((item) => item.score)) : null;

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
