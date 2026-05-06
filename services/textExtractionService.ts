import { z } from "zod";

export const formatExtractedTextSchema = z.object({
  text: z.string().min(1),
  mode: z.enum(["clean", "summary_ready"]).optional().default("clean"),
});

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function bestEffortPdfText(buffer: Buffer) {
  // Minimal dependency-free fallback: extracts readable text fragments from PDF bytes.
  // It is not a full PDF parser, but it prevents simple text PDFs from requiring manual paste.
  return normalizeWhitespace(
    buffer
      .toString("latin1")
      .replace(/\\[()]/g, "")
      .match(/[A-Za-z0-9][A-Za-z0-9\s.,:;'"!?/@#%&()_\-]{20,}/g)
      ?.join("\n") ?? "",
  );
}

export async function extractTextFromFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (file.type === "text/plain" || lowerName.endsWith(".txt")) {
    return normalizeWhitespace(buffer.toString("utf8"));
  }

  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    return bestEffortPdfText(buffer);
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return "";
  }

  return "";
}

export function formatExtractedText(payload: z.infer<typeof formatExtractedTextSchema>) {
  const parsed = formatExtractedTextSchema.parse(payload);
  const cleaned = normalizeWhitespace(parsed.text);
  if (parsed.mode === "summary_ready") {
    return cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `- ${line}`)
      .join("\n");
  }
  return cleaned;
}
