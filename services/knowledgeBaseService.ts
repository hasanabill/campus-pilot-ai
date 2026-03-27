import { z } from "zod";

import { connectToDatabase } from "@/lib/mongodb";
import KnowledgeBaseChunk from "@/models/KnowledgeBaseChunk";
import KnowledgeBaseDocument from "@/models/KnowledgeBaseDocument";
import { generateEmbedding, searchKnowledgeBase } from "@/services/aiService";

const KB_CATEGORIES = [
  "syllabus",
  "regulation",
  "internship",
  "notice",
  "handbook",
  "guideline",
] as const;

const KB_SOURCE_TYPES = ["pdf", "docx", "text"] as const;

export const kbUploadSchema = z.object({
  title: z.string().min(2).max(200),
  category: z.enum(KB_CATEGORIES),
  source_type: z.enum(KB_SOURCE_TYPES),
  cloudinary_url: z.url().max(2000),
  public_id: z.string().min(1).max(300),
  uploaded_by: z.string().min(1),
  department_id: z.string().min(1),
  document_text: z.string().min(20),
});

export const kbSearchSchema = z.object({
  q: z.string().min(2),
  topK: z.number().int().min(1).max(20).optional(),
  departmentId: z.string().optional(),
  documentId: z.string().optional(),
});

type KbUploadInput = z.infer<typeof kbUploadSchema>;

const CHUNK_SIZE_WORDS = 450;
const CHUNK_OVERLAP_WORDS = 80;

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

export function splitTextIntoChunks(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= CHUNK_SIZE_WORDS) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) {
      break;
    }
    start = Math.max(0, end - CHUNK_OVERLAP_WORDS);
  }

  return chunks;
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk);
    embeddings.push(embedding);
  }
  return embeddings;
}

export async function ingestKnowledgeBaseDocument(input: KbUploadInput) {
  const parsed = kbUploadSchema.parse(input);
  await connectToDatabase();

  const chunks = splitTextIntoChunks(parsed.document_text);
  if (chunks.length === 0) {
    throw new Error("No valid content found after text extraction.");
  }

  const kbDocument = await KnowledgeBaseDocument.create({
    title: parsed.title,
    category: parsed.category,
    source_type: parsed.source_type,
    cloudinary_url: parsed.cloudinary_url,
    public_id: parsed.public_id,
    uploaded_by: parsed.uploaded_by,
    department_id: parsed.department_id,
  });

  const embeddings = await embedChunks(chunks);

  await KnowledgeBaseChunk.insertMany(
    chunks.map((chunk, index) => ({
      document_id: kbDocument._id,
      chunk_index: index,
      chunk_text: chunk,
      embedding: embeddings[index],
      token_count: estimateTokenCount(chunk),
      metadata: {
        department_id: parsed.department_id,
        category: parsed.category,
        title: parsed.title,
        source_type: parsed.source_type,
      },
    })),
  );

  return {
    document_id: String(kbDocument._id),
    chunk_count: chunks.length,
  };
}

export async function searchKnowledgeBaseEntries(input: z.infer<typeof kbSearchSchema>) {
  const parsed = kbSearchSchema.parse(input);

  const results = await searchKnowledgeBase(parsed.q, {
    topK: parsed.topK,
    departmentId: parsed.departmentId,
    documentId: parsed.documentId,
  });

  return results;
}
