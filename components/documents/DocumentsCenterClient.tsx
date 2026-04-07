"use client";

import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";

const documentTypes = [
  "certificate",
  "recommendation_letter",
  "meeting_minutes",
  "report",
  "notice",
] as const;

const tones = ["formal", "neutral"] as const;

type InputRow = {
  key: string;
  value: string;
};

type UploadResult = {
  message?: string;
  file_name?: string;
  cloudinary_url?: string;
  public_id?: string;
  bytes?: number;
  error?: string;
};

export default function DocumentsCenterClient() {
  const [documentType, setDocumentType] =
    useState<(typeof documentTypes)[number]>("certificate");
  const [title, setTitle] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [tone, setTone] = useState<(typeof tones)[number]>("formal");
  const [maxWords, setMaxWords] = useState(500);
  const [inputRows, setInputRows] = useState<InputRow[]>([
    { key: "", value: "" },
  ]);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generatedCloudinaryUrl, setGeneratedCloudinaryUrl] = useState<
    string | null
  >(null);
  const [generatedPublicId, setGeneratedPublicId] = useState<string | null>(
    null
  );

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolder, setUploadFolder] = useState("campus-pilot/documents");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  function setInputRow(index: number, patch: Partial<InputRow>) {
    setInputRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addInputRow() {
    setInputRows((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeInputRow(index: number) {
    setInputRows((prev) => prev.filter((_, i) => i !== index));
  }

  function buildInputs() {
    const payload: Record<string, string> = {};
    inputRows.forEach((row) => {
      const k = row.key.trim();
      const v = row.value.trim();
      if (k && v) payload[k] = v;
    });
    return payload;
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerateError(null);
    setGenerateSuccess(null);
    setGeneratedCloudinaryUrl(null);
    setGeneratedPublicId(null);

    const inputs = buildInputs();
    if (!title.trim()) {
      setGenerateError("Title is required.");
      return;
    }
    if (Object.keys(inputs).length === 0) {
      setGenerateError("Add at least one key/value input.");
      return;
    }

    setGenerateLoading(true);
    try {
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: documentType,
          title: title.trim(),
          template_name: templateName.trim() || undefined,
          tone,
          max_words: maxWords,
          inputs,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to generate document.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const fileMatch = disposition.match(/filename="(.+?)"/);
      const fileName = fileMatch?.[1] ?? "generated-document.pdf";
      const cloudinaryUrl = response.headers.get("X-Document-Cloudinary-Url");
      const publicId = response.headers.get("X-Document-Public-Id");

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setGenerateSuccess(`Document generated and downloaded: ${fileName}`);
      setGeneratedCloudinaryUrl(cloudinaryUrl);
      setGeneratedPublicId(publicId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Document generation failed.";
      setGenerateError(message);
    } finally {
      setGenerateLoading(false);
    }
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    setUploadResult(null);

    if (!uploadFile) {
      setUploadError("Select a file before uploading.");
      return;
    }

    setUploadLoading(true);
    try {
      const form = new FormData();
      form.set("file", uploadFile);
      if (uploadFolder.trim()) form.set("folder", uploadFolder.trim());

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });

      const payload = (await response.json()) as UploadResult;
      if (!response.ok) {
        throw new Error(payload.error ?? "Document upload failed.");
      }

      setUploadResult(payload);
      setUploadFile(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Document upload failed.";
      setUploadError(message);
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <section className="space-y-6 text-zinc-700">
      <PageHeader
        title="Document Center"
        subtitle="Generate official documents using AI prompts and upload finalized files to Cloudinary."
      />

      <form
        onSubmit={onGenerate}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          Generate Document
        </h2>
        {generateError ? (
          <InlineAlert tone="error" message={generateError} />
        ) : null}
        {generateSuccess ? (
          <InlineAlert tone="success" message={generateSuccess} />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">
              Document Type
            </span>
            <select
              value={documentType}
              onChange={(event) =>
                setDocumentType(
                  event.target.value as (typeof documentTypes)[number]
                )
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {documentTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">
              Template Name (optional)
            </span>
            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">Tone</span>
            <select
              value={tone}
              onChange={(event) =>
                setTone(event.target.value as (typeof tones)[number])
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {tones.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Max Words</span>
          <input
            type="number"
            min={100}
            max={2000}
            value={maxWords}
            onChange={(event) => setMaxWords(Number(event.target.value))}
            className="w-40 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-900">
            Dynamic Inputs (Key/Value)
          </p>
          {inputRows.map((row, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input
                placeholder="Key (e.g. student_name)"
                value={row.key}
                onChange={(event) =>
                  setInputRow(index, { key: event.target.value })
                }
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Value"
                value={row.value}
                onChange={(event) =>
                  setInputRow(index, { value: event.target.value })
                }
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeInputRow(index)}
                disabled={inputRows.length === 1}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addInputRow}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Add Input Row
          </button>
        </div>

        <button
          type="submit"
          disabled={generateLoading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {generateLoading ? "Generating..." : "Generate + Download PDF"}
        </button>

        {generatedPublicId || generatedCloudinaryUrl ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p>Public ID: {generatedPublicId ?? "-"}</p>
            <p>
              Cloudinary URL:{" "}
              {generatedCloudinaryUrl ? (
                <a
                  className="underline"
                  href={generatedCloudinaryUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open generated file
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
        ) : null}
      </form>

      <form
        onSubmit={onUpload}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          Upload Existing Document
        </h2>
        {uploadError ? (
          <InlineAlert tone="error" message={uploadError} />
        ) : null}
        {uploadResult?.message ? (
          <InlineAlert tone="success" message={uploadResult.message} />
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">
            Cloudinary Folder
          </span>
          <input
            value={uploadFolder}
            onChange={(event) => setUploadFolder(event.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">File</span>
          <input
            type="file"
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={uploadLoading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {uploadLoading ? "Uploading..." : "Upload Document"}
        </button>

        {uploadResult?.public_id || uploadResult?.cloudinary_url ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p>File Name: {uploadResult.file_name ?? "-"}</p>
            <p>Public ID: {uploadResult.public_id ?? "-"}</p>
            <p>Size (bytes): {uploadResult.bytes ?? 0}</p>
            <p>
              Cloudinary URL:{" "}
              {uploadResult.cloudinary_url ? (
                <a
                  className="underline"
                  href={uploadResult.cloudinary_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open uploaded file
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
        ) : null}
      </form>
    </section>
  );
}
