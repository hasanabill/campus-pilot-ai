"use client";

import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";

const categories = [
  "syllabus",
  "regulation",
  "internship",
  "notice",
  "handbook",
  "guideline",
] as const;

const sourceTypes = ["pdf", "docx", "text"] as const;

type UploadResult = {
  message?: string;
  document_id?: string;
  chunk_count?: number;
  cloudinary_url?: string;
  public_id?: string;
  error?: string;
};

type KnowledgeBaseUploadClientProps = {
  defaultDepartmentId?: string | null;
};

export default function KnowledgeBaseUploadClient({
  defaultDepartmentId,
}: KnowledgeBaseUploadClientProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("notice");
  const [sourceType, setSourceType] = useState<(typeof sourceTypes)[number]>("pdf");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "");
  const [documentText, setDocumentText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  function resetForm() {
    setTitle("");
    setCategory("notice");
    setSourceType("pdf");
    setDepartmentId(defaultDepartmentId ?? "");
    setDocumentText("");
    setFile(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    if (documentText.trim().length < 20) {
      setError("Document text must be at least 20 characters for ingestion.");
      return;
    }
    if (!departmentId.trim()) {
      setError("Department ID is required.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title.trim());
      form.set("category", category);
      form.set("source_type", sourceType);
      form.set("department_id", departmentId.trim());
      form.set("document_text", documentText.trim());

      const response = await fetch("/api/kb/upload", {
        method: "POST",
        body: form,
      });

      const payload = (await response.json()) as UploadResult;
      if (!response.ok) {
        throw new Error(payload.error ?? "Knowledge base upload failed.");
      }

      setResult(payload);
      resetForm();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Knowledge base upload failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Knowledge Base Upload"
        subtitle="Upload source documents and ingest normalized text for AI retrieval."
      />

      {error ? <InlineAlert tone="error" message={error} /> : null}
      {result?.message ? <InlineAlert tone="success" message={result.message} /> : null}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">Title</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">Department ID</span>
            <input
              required
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">Source Type</span>
            <select
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as (typeof sourceTypes)[number])
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {sourceTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Knowledge File</span>
          <input
            type="file"
            required
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">Supported: PDF, DOCX, TXT (max 10MB).</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">
            Extracted / Manual Document Text (required for ingestion)
          </span>
          <textarea
            required
            value={documentText}
            onChange={(event) => setDocumentText(event.target.value)}
            minLength={20}
            className="min-h-40 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <div className="mt-1 text-right text-xs text-zinc-500">{documentText.length} chars</div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Uploading and ingesting..." : "Upload and Ingest"}
        </button>
      </form>

      {result ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Ingestion Result</h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            <li>Document ID: {result.document_id ?? "-"}</li>
            <li>Chunk Count: {result.chunk_count ?? 0}</li>
            <li>Public ID: {result.public_id ?? "-"}</li>
            <li>
              Cloudinary URL:{" "}
              {result.cloudinary_url ? (
                <a
                  href={result.cloudinary_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Open file
                </a>
              ) : (
                "-"
              )}
            </li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
