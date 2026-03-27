import { Types } from "mongoose";

import { openai } from "@/lib/openai";
import { connectToDatabase } from "@/lib/mongodb";
import KnowledgeBaseChunk from "@/models/KnowledgeBaseChunk";

type SearchOptions = {
  topK?: number;
  departmentId?: string;
  documentId?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatOptions = {
  topK?: number;
  departmentId?: string;
  documentId?: string;
  systemPrompt?: string;
  history?: ChatMessage[];
};

type DocumentOptions = {
  templateName?: string;
  tone?: "formal" | "neutral";
  maxWords?: number;
};

type SummaryOptions = {
  style?: "bullet" | "paragraph";
  maxWords?: number;
};

export type KnowledgeSearchResult = {
  chunkId: string;
  documentId: string;
  chunkText: string;
  score: number;
  metadata: Record<string, unknown>;
};

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
const TOP_K_DEFAULT = 5;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("Input text is required to generate embeddings.");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: normalized,
  });

  return response.data[0]?.embedding ?? [];
}

export async function searchKnowledgeBase(
  query: string,
  options: SearchOptions = {},
): Promise<KnowledgeSearchResult[]> {
  const topK = options.topK ?? TOP_K_DEFAULT;
  if (topK <= 0) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(query);
  await connectToDatabase();

  const filter: {
    document_id?: Types.ObjectId;
    "metadata.department_id"?: string;
  } = {};

  if (options.documentId && Types.ObjectId.isValid(options.documentId)) {
    filter.document_id = new Types.ObjectId(options.documentId);
  }

  if (options.departmentId) {
    filter["metadata.department_id"] = options.departmentId;
  }

  const chunks = await KnowledgeBaseChunk.find(filter)
    .select("document_id chunk_text embedding metadata")
    .lean<
      Array<{
        _id: Types.ObjectId;
        document_id: Types.ObjectId;
        chunk_text: string;
        embedding: number[];
        metadata?: Record<string, unknown>;
      }>
    >();

  const ranked = chunks
    .map((chunk) => ({
      chunkId: String(chunk._id),
      documentId: String(chunk.document_id),
      chunkText: chunk.chunk_text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
      metadata: chunk.metadata ?? {},
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked;
}

export async function generateChatResponse(
  question: string,
  options: ChatOptions = {},
): Promise<{ answer: string; context: KnowledgeSearchResult[] }> {
  const context = await searchKnowledgeBase(question, {
    topK: options.topK,
    departmentId: options.departmentId,
    documentId: options.documentId,
  });

  const systemPrompt =
    options.systemPrompt ??
    "You are an academic department assistant. Answer using the provided context only. If context is insufficient, instruct the user to contact the department office.";

  const contextBlock =
    context.length > 0
      ? context
          .map((item, index) => `[Context ${index + 1}] ${item.chunkText}`)
          .join("\n\n")
      : "No relevant knowledge base context found.";

  const historyMessages =
    options.history?.map((item) => ({
      role: item.role,
      content: item.content,
    })) ?? [];

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      {
        role: "user",
        content: `Context:\n${contextBlock}\n\nQuestion:\n${question}`,
      },
    ],
  });

  return {
    answer: completion.choices[0]?.message?.content?.trim() ?? "",
    context,
  };
}

export async function generateDocument(
  prompt: string,
  options: DocumentOptions = {},
): Promise<string> {
  const tone = options.tone ?? "formal";
  const maxWords = options.maxWords ?? 400;

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "Generate official academic department documents. Keep output concise, factual, and ready for administrative use.",
      },
      {
        role: "user",
        content: `Template: ${options.templateName ?? "general"}\nTone: ${tone}\nMax words: ${maxWords}\n\nInstruction:\n${prompt}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function summarizeText(
  text: string,
  options: SummaryOptions = {},
): Promise<string> {
  const style = options.style ?? "bullet";
  const maxWords = options.maxWords ?? 250;

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "You summarize academic and administrative content clearly and accurately.",
      },
      {
        role: "user",
        content: `Summarize the following text in ${style} style with maximum ${maxWords} words:\n\n${text}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
