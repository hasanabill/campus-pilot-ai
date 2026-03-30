import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";

import { generateDocument as generateDocumentText } from "@/services/aiService";

const documentTypes = [
  "certificate",
  "recommendation_letter",
  "meeting_minutes",
  "report",
  "notice",
] as const;

const tones = ["formal", "neutral"] as const;

export const generateDocumentSchema = z.object({
  document_type: z.enum(documentTypes),
  title: z.string().min(3).max(200),
  template_name: z.string().min(2).max(100).optional(),
  tone: z.enum(tones).optional().default("formal"),
  max_words: z.number().int().min(100).max(2000).optional().default(500),
  inputs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;

function toPrompt(payload: GenerateDocumentInput): string {
  const inputLines = Object.entries(payload.inputs)
    .map(([key, value]) => `- ${key}: ${String(value)}`)
    .join("\n");

  return [
    `Generate a ${payload.document_type.replace("_", " ")} document.`,
    `Title: ${payload.title}`,
    payload.template_name ? `Template: ${payload.template_name}` : "Template: default",
    "Use the following structured inputs:",
    inputLines || "- none",
    "The output should be professional and ready for official department use.",
  ].join("\n");
}

function wrapText(text: string, maxChars = 95): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of words) {
      if (!current) {
        current = word;
        continue;
      }

      const candidate = `${current} ${word}`;
      if (candidate.length > maxChars) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

async function createPdfBuffer(title: string, body: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 56;
  let y = 790;

  page.drawText(title, {
    x: marginX,
    y,
    size: 18,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 34;

  const lines = wrapText(body);
  const fontSize = 11;
  const lineHeight = 16;

  for (const line of lines) {
    if (y <= 60) {
      y = 790;
      pdfDoc.addPage([595.28, 841.89]);
    }

    const targetPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    targetPage.drawText(line, {
      x: marginX,
      y,
      size: fontSize,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= lineHeight;
  }

  return pdfDoc.save();
}

function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function generateDocumentBundle(payload: GenerateDocumentInput) {
  const parsed = generateDocumentSchema.parse(payload);
  const prompt = toPrompt(parsed);

  const generatedText = await generateDocumentText(prompt, {
    templateName: parsed.template_name,
    tone: parsed.tone,
    maxWords: parsed.max_words,
  });

  const pdfBytes = await createPdfBuffer(parsed.title, generatedText);

  return {
    generated_text: generatedText,
    pdf_bytes: pdfBytes,
    file_name: `${safeFileName(parsed.title) || "generated-document"}.pdf`,
  };
}
