"use client";

import { FormEvent, useEffect, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader  from "@/components/ui/PageHeader";

const documentTypes = ["certificate", "recommendation_letter", "meeting_minutes", "report", "notice"] as const;
const tones         = ["formal", "neutral"] as const;

type InputRow    = { key: string; value: string };
type UploadResult = { message?: string; file_name?: string; cloudinary_url?: string; public_id?: string; bytes?: number; error?: string };
type Template = { _id: string; name: string; type: string; template_body: string; is_active: boolean };
type GeneratedDocument = { _id: string; status: string; cloudinary_url: string; public_id: string; created_at?: string };

export default function DocumentsCenterClient() {
  /* ── Generate state ── */
  const [documentType,        setDocumentType]        = useState<(typeof documentTypes)[number]>("certificate");
  const [title,               setTitle]               = useState("");
  const [templateId,          setTemplateId]          = useState("");
  const [templateName,        setTemplateName]        = useState("");
  const [tone,                setTone]                = useState<(typeof tones)[number]>("formal");
  const [maxWords,            setMaxWords]            = useState(500);
  const [inputRows,           setInputRows]           = useState<InputRow[]>([{ key: "", value: "" }]);
  const [generateLoading,     setGenerateLoading]     = useState(false);
  const [generateError,       setGenerateError]       = useState<string | null>(null);
  const [generateSuccess,     setGenerateSuccess]     = useState<string | null>(null);
  const [generatedCloudinaryUrl, setGeneratedCloudinaryUrl] = useState<string | null>(null);
  const [generatedPublicId,   setGeneratedPublicId]   = useState<string | null>(null);
  const [templates,           setTemplates]           = useState<Template[]>([]);
  const [documents,           setDocuments]           = useState<GeneratedDocument[]>([]);
  const [newTemplateName,     setNewTemplateName]     = useState("");
  const [newTemplateBody,     setNewTemplateBody]     = useState("");

  /* ── Upload state ── */
  const [uploadFile,    setUploadFile]    = useState<File | null>(null);
  const [uploadFolder,  setUploadFolder]  = useState("campus-pilot/documents");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const [uploadResult,  setUploadResult]  = useState<UploadResult | null>(null);

  function setRow(i: number, patch: Partial<InputRow>) {
    setInputRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function buildInputs() {
    const out: Record<string, string> = {};
    inputRows.forEach(({ key, value }) => { if (key.trim() && value.trim()) out[key.trim()] = value.trim(); });
    return out;
  }

  async function loadRecords() {
    const [templateRes, documentRes] = await Promise.all([
      fetch("/api/document-templates?is_active=true&limit=50"),
      fetch("/api/generated-documents?limit=20"),
    ]);
    const [templatePayload, documentPayload] = await Promise.all([
      templateRes.json() as Promise<{ templates?: Template[] }>,
      documentRes.json() as Promise<{ documents?: GeneratedDocument[] }>,
    ]);
    setTemplates(templatePayload.templates ?? []);
    setDocuments(documentPayload.documents ?? []);
  }

  useEffect(() => { void loadRecords(); }, []);

  async function createTemplate() {
    if (!newTemplateName.trim() || !newTemplateBody.trim()) return;
    const res = await fetch("/api/document-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTemplateName.trim(),
        type: documentType,
        template_body: newTemplateBody.trim(),
        placeholders: inputRows.map((row) => row.key.trim()).filter(Boolean),
      }),
    });
    if (res.ok) {
      setNewTemplateName("");
      setNewTemplateBody("");
      await loadRecords();
    }
  }

  async function onGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGenerateError(null); setGenerateSuccess(null);
    setGeneratedCloudinaryUrl(null); setGeneratedPublicId(null);

    if (!title.trim())                          { setGenerateError("Title is required."); return; }
    if (Object.keys(buildInputs()).length === 0) { setGenerateError("Add at least one key/value input."); return; }

    setGenerateLoading(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_type: documentType, title: title.trim(), template_id: templateId || undefined, template_name: templateName.trim() || undefined, tone, max_words: maxWords, inputs: buildInputs() }),
      });

      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(p?.error ?? "Failed to generate document.");
      }

      const blob        = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match       = disposition.match(/filename="(.+?)"/);
      const fileName    = match?.[1] ?? "generated-document.pdf";

      const url  = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);

      setGenerateSuccess(`Downloaded: ${fileName}`);
      setGeneratedCloudinaryUrl(res.headers.get("X-Document-Cloudinary-Url"));
      setGeneratedPublicId(res.headers.get("X-Document-Public-Id"));
      await loadRecords();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Document generation failed.");
    } finally {
      setGenerateLoading(false);
    }
  }

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null); setUploadResult(null);
    if (!uploadFile) { setUploadError("Select a file before uploading."); return; }

    setUploadLoading(true);
    try {
      const form = new FormData();
      form.set("file", uploadFile);
      if (uploadFolder.trim()) form.set("folder", uploadFolder.trim());

      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const p   = (await res.json()) as UploadResult;
      if (!res.ok) throw new Error(p.error ?? "Upload failed.");
      setUploadResult(p); setUploadFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Document Center"
        subtitle="Generate official documents with AI and upload finalized files to Cloudinary."
      />

      {/* ── Generate form ── */}
      <form onSubmit={onGenerate} className="cp-card space-y-5">
        <div className="border-b border-zinc-100 pb-4">
          <h2 className="text-base font-bold text-zinc-900">Generate document</h2>
          <p className="mt-0.5 text-xs text-zinc-500">AI drafts the document; a PDF is downloaded and stored in Cloudinary.</p>
        </div>

        {generateError   ? <InlineAlert tone="error"   message={generateError}   /> : null}
        {generateSuccess ? <InlineAlert tone="success" message={generateSuccess} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="doc-type" className="cp-label">Document type</label>
            <select id="doc-type" value={documentType} onChange={(e) => setDocumentType(e.target.value as typeof documentType)} className="cp-select">
              {documentTypes.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="doc-title" className="cp-label">Title</label>
            <input id="doc-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Completion Certificate – Jane Smith" className="cp-input" />
          </div>
          <div>
            <label htmlFor="doc-template-id" className="cp-label">Stored template <span className="font-normal text-zinc-400">(optional)</span></label>
            <select id="doc-template-id" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="cp-select">
              <option value="">No stored template</option>
              {templates.filter((template) => template.type === documentType).map((template) => (
                <option key={template._id} value={template._id}>{template.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="doc-template" className="cp-label">Template name hint <span className="font-normal text-zinc-400">(optional)</span></label>
            <input id="doc-template" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="default" className="cp-input" />
          </div>
          <div>
            <label htmlFor="doc-tone" className="cp-label">Tone</label>
            <select id="doc-tone" value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="cp-select">
              {tones.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="doc-words" className="cp-label">Max words</label>
            <input id="doc-words" type="number" min={100} max={2000} value={maxWords} onChange={(e) => setMaxWords(Number(e.target.value))} className="cp-input w-36" />
          </div>
        </div>

        {/* Key/value inputs */}
        <div className="space-y-2">
          <p className="cp-label">Dynamic inputs (key / value)</p>
          {inputRows.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input value={row.key}   onChange={(e) => setRow(i, { key:   e.target.value })} placeholder="Key (e.g. student_name)" className="cp-input" />
              <input value={row.value} onChange={(e) => setRow(i, { value: e.target.value })} placeholder="Value" className="cp-input" />
              <button type="button" onClick={() => setInputRows((p) => p.filter((_, idx) => idx !== i))} disabled={inputRows.length === 1} className="cp-btn-secondary text-xs px-3 disabled:opacity-40">
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setInputRows((p) => [...p, { key: "", value: "" }])} className="cp-btn-ghost text-xs text-zinc-500">
            + Add row
          </button>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <button type="submit" disabled={generateLoading} className="cp-btn-primary w-full py-2.5">
            {generateLoading ? "Generating…" : "Generate + Download PDF"}
          </button>
        </div>

        {(generatedPublicId ?? generatedCloudinaryUrl) ? (
          <div className="cp-card-2 space-y-1 text-xs">
            <p><span className="text-zinc-400">Public ID:</span> {generatedPublicId ?? "—"}</p>
            {generatedCloudinaryUrl ? (
              <p><span className="text-zinc-400">Cloudinary:</span>{" "}
                <a href={generatedCloudinaryUrl} target="_blank" rel="noreferrer" className="text-sky-600 underline">Open file ↗</a>
              </p>
            ) : null}
          </div>
        ) : null}
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="cp-card space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Template library</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Create reusable templates for AI document generation.</p>
          </div>
          <input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Template name" className="cp-input" />
          <textarea value={newTemplateBody} onChange={(e) => setNewTemplateBody(e.target.value)} placeholder="Template body with placeholders..." className="cp-textarea min-h-28" />
          <button type="button" onClick={() => void createTemplate()} className="cp-btn-primary w-full">Save Template</button>
          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template._id} className="cp-card-2">
                <p className="font-medium text-zinc-900">{template.name}</p>
                <p className="text-xs text-zinc-500">{template.type.replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="cp-card space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Generated document registry</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Recently generated records and approval statuses.</p>
          </div>
          <div className="space-y-2">
            {documents.map((document) => (
              <div key={document._id} className="cp-card-2 text-xs">
                <p className="font-mono text-zinc-700">{document._id}</p>
                <p className="mt-1 text-zinc-900">Status: {document.status}</p>
                <a href={document.cloudinary_url} target="_blank" rel="noreferrer" className="mt-1 block text-sky-700 underline">Open file</a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upload form ── */}
      <form onSubmit={onUpload} className="cp-card space-y-5">
        <div className="border-b border-zinc-100 pb-4">
          <h2 className="text-base font-bold text-zinc-900">Upload existing document</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Upload a finalized file directly to Cloudinary.</p>
        </div>

        {uploadError          ? <InlineAlert tone="error"   message={uploadError} /> : null}
        {uploadResult?.message ? <InlineAlert tone="success" message={uploadResult.message} /> : null}

        <div>
          <label htmlFor="up-folder" className="cp-label">Cloudinary folder</label>
          <input id="up-folder" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} className="cp-input" />
        </div>

        <div>
          <label htmlFor="up-file" className="cp-label">File</label>
          <input
            id="up-file" type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="cp-input cursor-pointer"
          />
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <button type="submit" disabled={uploadLoading} className="cp-btn-primary w-full py-2.5">
            {uploadLoading ? "Uploading…" : "Upload Document"}
          </button>
        </div>

        {(uploadResult?.public_id ?? uploadResult?.cloudinary_url) ? (
          <div className="cp-card-2 space-y-1 text-xs">
            <p><span className="text-zinc-400">File:</span>      {uploadResult.file_name ?? "—"}</p>
            <p><span className="text-zinc-400">Public ID:</span> {uploadResult.public_id ?? "—"}</p>
            <p><span className="text-zinc-400">Size:</span>      {uploadResult.bytes ?? 0} bytes</p>
            {uploadResult.cloudinary_url ? (
              <p><span className="text-zinc-400">Cloudinary:</span>{" "}
                <a href={uploadResult.cloudinary_url} target="_blank" rel="noreferrer" className="text-sky-600 underline">Open file ↗</a>
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    </section>
  );
}
