"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";

type Resource = "departments" | "students" | "faculty" | "courses" | "rooms" | "lab-resources";

const resources: Resource[] = ["departments", "students", "faculty", "courses", "rooms", "lab-resources"];

const templates: Record<Resource, Record<string, unknown>> = {
  departments: { name: "", code: "", office_email: "", office_phone: "" },
  students: { user_id: "", student_id: "", program: "", semester: 1, batch: "" },
  faculty: { user_id: "", employee_id: "", designation: "", specialization: "", workload_limit: 0 },
  courses: { name: "", code: "", department_id: "", credits: 3, prerequisites: [], syllabus_url: "" },
  rooms: { room_code: "", building: "", capacity: 30, room_type: "classroom", is_active: true },
  "lab-resources": { name: "", resource_type: "", quantity: 1, lab_room_id: "", is_active: true },
};

export default function MasterDataClient() {
  const [resource, setResource] = useState<Resource>("departments");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [json, setJson] = useState(JSON.stringify(templates.departments, null, 2));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fieldHint = useMemo(() => Object.keys(templates[resource]).join(", "), [resource]);

  const load = useCallback(async (nextResource = resource) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/master-data/${nextResource}?limit=20`);
      const payload = (await res.json()) as { items?: Record<string, unknown>[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load master data.");
      setItems(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load master data.");
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => { void load(); }, [load]);

  function changeResource(next: Resource) {
    setResource(next);
    setJson(JSON.stringify(templates[next], null, 2));
    void load(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const body = JSON.parse(json) as Record<string, unknown>;
      const res = await fetch(`/api/master-data/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to create record.");
      setMessage("Master-data record created.");
      setJson(JSON.stringify(templates[resource], null, 2));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON or create failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Master Data" subtitle="Admin-only management for departments, students, faculty, courses, rooms, and lab resources." />
      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form onSubmit={submit} className="cp-card space-y-4">
          <div>
            <label className="cp-label" htmlFor="resource">Resource</label>
            <select id="resource" value={resource} onChange={(e) => changeResource(e.target.value as Resource)} className="cp-select">
              {resources.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <p className="text-xs text-zinc-500">Fields: {fieldHint}</p>
          <div>
            <label className="cp-label" htmlFor="record-json">Record JSON</label>
            <textarea id="record-json" value={json} onChange={(e) => setJson(e.target.value)} className="cp-textarea min-h-72 font-mono text-xs" />
          </div>
          <button type="submit" disabled={loading} className="cp-btn-primary w-full">{loading ? "Saving..." : "Create Record"}</button>
        </form>

        <div className="cp-card space-y-3">
          <p className="cp-section-title">Current records</p>
          {items.length === 0 ? <EmptyState title="No records" description="Create the first record for this resource." /> : null}
          <div className="space-y-3">
            {items.map((item) => (
              <pre key={String(item._id)} className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-900">
                {JSON.stringify(item, null, 2)}
              </pre>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
