"use client";

import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader  from "@/components/ui/PageHeader";

const categories  = ["syllabus", "regulation", "internship", "notice", "handbook", "guideline"] as const;
const sourceTypes = ["pdf", "docx", "text"] as const;

type UploadResult = {
  message?: string;
  document_id?: string;
  chunk_count?: number;
  cloudinary_url?: string;
  public_id?: string;
  bytes?: number;
  error?: string;
};

export default function KnowledgeBaseUploadClient({
  defaultDepartmentId,
}: {
  defaultDepartmentId?: string | null;
}) {
  const [title,        setTitle]        = useState("");
  const [category,     setCategory]     = useState<(typeof categories)[number]>("notice");
  const [sourceType,   setSourceType]   = useState<(typeof sourceTypes)[number]>("pdf");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "");
  const [documentText, setDocumentText] = useState("");
  const [file,         setFile]         = useState<File | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [result,       setResult]       = useState<UploadResult | null>(null);

  function reset() {
    setTitle(""); setCategory("notice"); setSourceType("pdf");
    setDepartmentId(defaultDepartmentId ?? ""); setDocumentText(""); setFile(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setResult(null);

    if (!file)                        { setError("Please select a file."); return; }
    if (documentText.trim().length < 20) { setError("Document text must be at least 20 characters."); return; }
    if (!departmentId.trim())         { setError("Department ID is required."); return; }

    setLoading(true);
    try {
      const form = new FormData();
      form.set("file", file); form.set("title", title.trim());
      form.set("category", category); form.set("source_type", sourceType);
      form.set("department_id", departmentId.trim()); form.set("document_text", documentText.trim());

      const res     = await fetch("/api/kb/upload", { method: "POST", body: form });
      const payload = (await res.json()) as UploadResult;
      if (!res.ok) throw new Error(payload.error ?? "Upload failed.");
      setResult(payload); reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-3xl mx-auto space-y-5">
      <PageHeader
        title="Knowledge Base Upload"
        subtitle="Upload source documents and ingest normalised text for AI retrieval."
      />

      {error          ? <InlineAlert tone="error"   message={error} /> : null}
      {result?.message ? <InlineAlert tone="success" message={result.message} /> : null}

      <form onSubmit={onSubmit} className="cp-card space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="kb-title" className="cp-label">Title</label>
            <input id="kb-title" required value={title} onChange={(e) => setTitle(e.target.value)} className="cp-input" placeholder="Course Handbook 2024" />
          </div>
          <div>
            <label htmlFor="kb-dept" className="cp-label">Department ID</label>
            <input id="kb-dept" required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="cp-input" placeholder="dept_xxxxx" />
          </div>
          <div>
            <label htmlFor="kb-cat" className="cp-label">Category</label>
            <select id="kb-cat" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="cp-select">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="kb-src" className="cp-label">Source type</label>
            <select id="kb-src" value={sourceType} onChange={(e) => setSourceType(e.target.value as typeof sourceType)} className="cp-select">
              {sourceTypes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="kb-file" className="cp-label">File</label>
          <input
            id="kb-file" type="file" required
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="cp-input cursor-pointer"
          />
          <p className="mt-1 text-xs text-zinc-400">Supported: PDF, DOCX, TXT · Max 10 MB</p>
        </div>

        <div>
          <label htmlFor="kb-text" className="cp-label">Extracted / manual document text <span className="font-normal text-zinc-400">(required for ingestion)</span></label>
          <textarea
            id="kb-text" required minLength={20}
            value={documentText} onChange={(e) => setDocumentText(e.target.value)}
            className="cp-textarea"
            placeholder="Paste the full text content of the document here…"
          />
          <p className="mt-1 text-right text-xs text-zinc-400">{documentText.length} chars</p>
        </div>

        <button type="submit" disabled={loading} className="cp-btn-primary w-full py-2.5">
          {loading ? "Uploading and ingesting…" : "Upload and Ingest"}
        </button>
      </form>

      {result ? (
        <div className="cp-card space-y-2">
          <p className="cp-section-title">Ingestion result</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Document ID",  result.document_id ?? "-"],
              ["Chunks",       String(result.chunk_count ?? 0)],
              ["Public ID",    result.public_id ?? "-"],
            ].map(([k, v]) => (
              <div key={k} className="cp-card-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{k}</p>
                <p className="mt-0.5 text-sm font-medium text-zinc-900 break-all">{v}</p>
              </div>
            ))}
            {result.cloudinary_url ? (
              <div className="cp-card-2 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Cloudinary URL</p>
                <a href={result.cloudinary_url} target="_blank" rel="noreferrer" className="mt-0.5 block text-sm font-medium text-sky-700 underline break-all">
                  Open file ↗
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
