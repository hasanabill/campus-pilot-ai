import { Types } from "mongoose";
import { z } from "zod";

import { getCache, getOrSetCache, setCache } from "@/lib/cache";
import { openai } from "@/lib/openai";
import { connectToDatabase } from "@/lib/mongodb";
import Department from "@/models/Department";
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
const EMBEDDING_CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 2 * 60 * 1000;
const CHAT_CACHE_TTL_MS = 30 * 1000;
const STRUCTURED_CACHE_TTL_MS = 5 * 60 * 1000;

const TICKET_TYPES = [
  "certificate",
  "transcript",
  "correction",
  "permission",
  "internship",
  "other",
] as const;
const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const ROUTING_DECISIONS = ["answer", "ask_clarifying", "route_to_ticket", "route_to_human"] as const;

export const ticketClassificationSchema = z.object({
  type: z.enum(TICKET_TYPES),
  priority: z.enum(TICKET_PRIORITIES),
  confidence: z.number().min(0).max(1),
  title: z.string().min(3).max(200),
});

export const suggestedTicketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  type: z.enum(TICKET_TYPES),
  priority: z.enum(TICKET_PRIORITIES),
});

export const chatRoutingSchema = z.object({
  decision: z.enum(ROUTING_DECISIONS),
  reason: z.string().max(800),
  confidence: z.number().min(0).max(1).optional(),
  clarifying_question: z.string().max(600).optional(),
  suggested_ticket: suggestedTicketSchema.optional(),
});

export type TicketClassification = z.infer<typeof ticketClassificationSchema>;
export type ChatRoutingDecision = z.infer<typeof chatRoutingSchema>;

export function isAiExtendedFeaturesEnabled(): boolean {
  return process.env.ENABLE_AI_EXTENDED_FEATURES !== "false";
}

export function isTimetableProposerEnabled(): boolean {
  return process.env.ENABLE_TIMETABLE_PROPOSER !== "false";
}
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "need",
  "of",
  "on",
  "or",
  "please",
  "the",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "with",
]);
const QUERY_SYNONYMS: Record<string, string[]> = {
  apply: ["application", "request", "submit"],
  application: ["apply", "request", "submit"],
  certificate: ["document", "letter", "form"],
  class: ["course", "routine", "schedule"],
  course: ["class", "subject"],
  date: ["deadline", "time", "schedule"],
  deadline: ["date", "time", "last date"],
  document: ["certificate", "letter", "form", "paper"],
  fee: ["payment", "charge", "cost"],
  form: ["document", "application"],
  internship: ["industrial training", "placement"],
  marksheet: ["transcript", "result"],
  payment: ["fee", "charge"],
  result: ["marksheet", "transcript"],
  routine: ["schedule", "timetable", "class"],
  schedule: ["routine", "timetable", "date"],
  transcript: ["marksheet", "result"],
};

function stableHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function trimText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildSearchQueries(query: string): string[] {
  const tokens = tokenize(query);
  const expandedTerms = tokens.flatMap((token) => [token, ...(QUERY_SYNONYMS[token] ?? [])]);
  return uniqueValues([query, tokens.join(" "), expandedTerms.join(" ")]);
}

function keywordScore(queryTerms: string[], text: string): number {
  if (queryTerms.length === 0) return 0;

  const haystack = text.toLowerCase();
  const matched = queryTerms.filter((term) => haystack.includes(term.toLowerCase())).length;
  return matched / queryTerms.length;
}

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

  const cacheKey = `embedding:${EMBEDDING_MODEL}:${stableHash(normalized)}`;
  return getOrSetCache(cacheKey, EMBEDDING_CACHE_TTL_MS, async () => {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: normalized,
    });

    return response.data[0]?.embedding ?? [];
  });
}

export async function searchKnowledgeBase(
  query: string,
  options: SearchOptions = {},
): Promise<KnowledgeSearchResult[]> {
  const topK = options.topK ?? TOP_K_DEFAULT;
  if (topK <= 0) {
    return [];
  }

  const cacheKey = `kb-search:${stableHash(JSON.stringify({ query, topK, ...options }))}`;
  const cached = getCache<KnowledgeSearchResult[]>(cacheKey);
  if (cached) return cached;

  const searchQueries = buildSearchQueries(query);
  const queryTerms = tokenize(searchQueries.join(" "));
  const queryEmbeddings = await Promise.all(searchQueries.map((searchQuery) => generateEmbedding(searchQuery)));
  await connectToDatabase();

  const filter: Record<string, unknown> = {};

  if (options.documentId && Types.ObjectId.isValid(options.documentId)) {
    filter.document_id = new Types.ObjectId(options.documentId);
  }

  if (options.departmentId) {
    const rawDepartment = options.departmentId.trim();
    const departmentIds = new Set<string>([rawDepartment]);
    const departmentCodes = new Set<string>([rawDepartment, rawDepartment.toUpperCase()]);

    if (!Types.ObjectId.isValid(rawDepartment)) {
      const department = await Department.findOne({
        $or: [
          { code: rawDepartment.toUpperCase() },
          { name: { $regex: `\\b${escapeRegExp(rawDepartment)}\\b`, $options: "i" } },
        ],
      })
        .select("_id code")
        .lean<{ _id: Types.ObjectId; code?: string } | null>();
      if (department) {
        departmentIds.add(String(department._id));
        if (department.code) {
          departmentCodes.add(department.code);
          departmentCodes.add(department.code.toUpperCase());
        }
      }
    }

    filter.$or = [
      { "metadata.department_id": { $in: Array.from(departmentIds) } },
      { "metadata.department_code_or_id": { $in: Array.from(departmentCodes) } },
      { "metadata.department_code": { $in: Array.from(departmentCodes) } },
    ];
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

  const results = chunks
    .map((chunk) => {
      const metadata = chunk.metadata ?? {};
      const metadataText = [metadata.title, metadata.category, metadata.source_type]
        .filter((value): value is string => typeof value === "string")
        .join(" ");
      const vectorScore = Math.max(
        ...queryEmbeddings.map((queryEmbedding) => cosineSimilarity(queryEmbedding, chunk.embedding)),
      );
      const lexicalScore = keywordScore(queryTerms, `${metadataText} ${chunk.chunk_text}`);

      return {
        chunkId: String(chunk._id),
        documentId: String(chunk.document_id),
        chunkText: chunk.chunk_text,
        score: vectorScore + lexicalScore * 0.18,
        metadata: {
          ...metadata,
          vector_score: Number(vectorScore.toFixed(4)),
          keyword_score: Number(lexicalScore.toFixed(4)),
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (results.length > 0) {
    setCache(cacheKey, results, SEARCH_CACHE_TTL_MS);
  }

  return results;
}

export async function generateChatResponse(
  question: string,
  options: ChatOptions = {},
): Promise<{ answer: string; context: KnowledgeSearchResult[] }> {
  const cacheKey = `chat:${stableHash(
    JSON.stringify({
      q: question,
      topK: options.topK,
      dept: options.departmentId,
      doc: options.documentId,
      h: (options.history ?? []).slice(-4),
    }),
  )}`;

  const cached = getCache<{ answer: string; context: KnowledgeSearchResult[] }>(cacheKey);
  if (cached) return cached;

  const context = await searchKnowledgeBase(question, {
    topK: options.topK ?? 6,
    departmentId: options.departmentId,
    documentId: options.documentId,
  });

  const systemPrompt =
    options.systemPrompt ??
    "You are an academic department assistant. Use only the provided knowledge base context and FAQ data. If the context is missing or weak, say you do not have enough department information and ask the user to contact the department office.";

  const contextBlock =
    context.length > 0
      ? context
          .map(
            (item, index) =>
              `[C${index + 1} | score ${item.score.toFixed(3)}] ${trimText(item.chunkText, 900)}`,
          )
          .join("\n")
      : "No relevant context.";

  const historyMessages =
    (options.history ?? []).slice(-4).map((item) => ({
      role: item.role,
      content: trimText(item.content, 220),
    })) ?? [];

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      {
        role: "user",
        content: `Context:\n${contextBlock}\nQuestion:\n${trimText(question, 300)}`,
      },
    ],
  });

  const result = {
    answer: completion.choices[0]?.message?.content?.trim() ?? "",
    context,
  };

  if (context.length > 0) {
    setCache(cacheKey, result, CHAT_CACHE_TTL_MS);
  }

  return result;
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

type ExtractStructuredArgs<T extends z.ZodTypeAny> = {
  system: string;
  user: string;
  schema: T;
  cacheKey?: string;
  ttlMs?: number;
};

export async function extractStructured<T extends z.ZodTypeAny>(
  args: ExtractStructuredArgs<T>,
): Promise<z.infer<T>> {
  const ttl = args.ttlMs ?? STRUCTURED_CACHE_TTL_MS;
  const key = args.cacheKey ?? `struct:${stableHash(`${args.system}|${args.user}`)}`;
  const cached = getCache<z.infer<T>>(key);
  if (cached) {
    return cached;
  }

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON for structured extraction.");
  }

  const parsed = args.schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Structured extraction failed validation: ${parsed.error.message}`);
  }

  setCache(key, parsed.data, ttl);
  return parsed.data;
}

export async function classifyTicketTypePriority(text: string): Promise<TicketClassification> {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("Text is required for ticket classification.");
  }

  return extractStructured({
    system:
      "You classify academic department service requests. Return compact JSON only. " +
      "Map requests to one ticket type: certificate, transcript, correction, permission, internship, other. " +
      "Choose priority: low, medium, high, urgent based on urgency and deadlines mentioned. " +
      "Provide confidence between 0 and 1. Provide a short actionable title (max 120 chars).",
    user: `Service request text:\n${trimText(normalized, 4000)}`,
    schema: ticketClassificationSchema,
    cacheKey: `ticket-classify:${stableHash(normalized)}`,
  });
}

export type ClassifyChatRoutingInput = {
  question: string;
  role: string;
  answerPreview: string;
  kbChunkCount: number;
  maxScore: number | null;
};

export async function classifyChatRouting(input: ClassifyChatRoutingInput): Promise<ChatRoutingDecision> {
  const cacheKey = `chat-route:${stableHash(JSON.stringify(input))}`;
  return extractStructured({
    system:
      "You route academic chat queries. Return JSON only. Decisions: " +
      "answer = knowledge response is enough; ask_clarifying = need specific missing details; " +
      "route_to_ticket = formal tracked request/triage needed (student-facing intake); " +
      "route_to_human = sensitive/complex and needs staff (discrimination, grades disputes, legal). " +
      "If route_to_ticket and role is student, include suggested_ticket with title, description, type, priority " +
      "aligned with transcript/certificate/correction/permission/internship/other. " +
      "Never invent policy facts; suggested_ticket should restate the user's request clearly.",
    user: JSON.stringify({
      question: trimText(input.question, 800),
      role: input.role,
      assistant_answer_preview: trimText(input.answerPreview, 1200),
      kb_chunk_count: input.kbChunkCount,
      kb_best_score: input.maxScore,
    }),
    schema: chatRoutingSchema,
    cacheKey,
  });
}
