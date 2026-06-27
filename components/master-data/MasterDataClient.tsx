"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";

type Resource = "departments" | "students" | "faculty" | "courses" | "rooms" | "lab-resources";
type EditableResource = Exclude<Resource, "students" | "faculty">;
type FormValue = string | number | boolean;
type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "email" | "number" | "url" | "checkbox" | "select" | "textarea";
  placeholder?: string;
  helper?: string;
  options?: Array<{ label: string; value: string }>;
  optional?: boolean;
};

const resources: EditableResource[] = ["departments", "courses", "rooms", "lab-resources"];

const resourceLabels: Record<Resource, string> = {
  departments: "Departments",
  students: "Students",
  faculty: "Faculty",
  courses: "Courses",
  rooms: "Rooms",
  "lab-resources": "Lab Resources",
};

const singularResourceLabels: Record<Resource, string> = {
  departments: "Department",
  students: "Student",
  faculty: "Faculty",
  courses: "Course",
  rooms: "Room",
  "lab-resources": "Lab Resource",
};

const resourceDescriptions: Record<Resource, string> = {
  departments: "Create academic departments used by users, courses, and knowledge-base content.",
  students: "Link student profile records to existing user accounts.",
  faculty: "Link faculty profile records to existing user accounts.",
  courses: "Create course records used by schedules and routine generation.",
  rooms: "Create classrooms, labs, and exam halls used by schedules.",
  "lab-resources": "Track equipment or resources inside lab rooms.",
};

const templates: Record<Resource, Record<string, FormValue>> = {
  departments: { name: "", code: "", office_email: "", office_phone: "" },
  students: { user_id: "", student_id: "", program: "", semester: 1, batch: "" },
  faculty: { user_id: "", employee_id: "", designation: "", specialization: "", workload_limit: 0 },
  courses: { name: "", code: "", department_id: "", credits: 3, prerequisites: "", syllabus_url: "" },
  rooms: { room_code: "", building: "", capacity: 30, room_type: "classroom", is_active: true },
  "lab-resources": { name: "", resource_type: "", quantity: 1, lab_room_id: "", is_active: true },
};

const fields: Record<Resource, FieldConfig[]> = {
  departments: [
    { key: "name", label: "Department Name", type: "text", placeholder: "Computing and Information System" },
    { key: "code", label: "Code", type: "text", placeholder: "CIS" },
    { key: "office_email", label: "Office Email", type: "email", placeholder: "office@example.edu" },
    { key: "office_phone", label: "Office Phone", type: "text", placeholder: "+880...", optional: true },
  ],
  students: [
    { key: "user_id", label: "User ID", type: "text", helper: "MongoDB _id of the student user account." },
    { key: "student_id", label: "Student ID", type: "text", placeholder: "2026-001" },
    { key: "program", label: "Program", type: "text", placeholder: "BSc in Computing and Information System" },
    { key: "semester", label: "Current Semester", type: "number" },
    { key: "batch", label: "Batch", type: "text", placeholder: "Batch 15" },
  ],
  faculty: [
    { key: "user_id", label: "User ID", type: "text", helper: "MongoDB _id of the faculty user account." },
    { key: "employee_id", label: "Employee ID", type: "text", placeholder: "FAC-001" },
    { key: "designation", label: "Designation", type: "text", placeholder: "Assistant Professor" },
    { key: "specialization", label: "Specialization", type: "text", placeholder: "AI, Networks, Database", optional: true },
    { key: "workload_limit", label: "Workload Limit", type: "number" },
  ],
  courses: [
    { key: "name", label: "Course Name", type: "text", placeholder: "Data Structures" },
    { key: "code", label: "Course Code", type: "text", placeholder: "CIS-2201" },
    {
      key: "department_id",
      label: "Department",
      type: "text",
      placeholder: "CIS or department MongoDB _id",
      helper: "You can enter a department code such as CIS, or a MongoDB _id.",
    },
    { key: "credits", label: "Credits", type: "number" },
    {
      key: "prerequisites",
      label: "Prerequisites",
      type: "text",
      placeholder: "CIS-1101, MAT-1201",
      helper: "Comma-separated course codes or ids.",
      optional: true,
    },
    { key: "syllabus_url", label: "Syllabus URL", type: "url", placeholder: "https://...", optional: true },
  ],
  rooms: [
    { key: "room_code", label: "Room Code", type: "text", placeholder: "Room 301" },
    { key: "building", label: "Building", type: "text", placeholder: "Academic Building" },
    { key: "capacity", label: "Capacity", type: "number" },
    {
      key: "room_type",
      label: "Room Type",
      type: "select",
      options: [
        { label: "Classroom", value: "classroom" },
        { label: "Lab", value: "lab" },
        { label: "Exam Hall", value: "exam_hall" },
      ],
    },
    { key: "is_active", label: "Active Room", type: "checkbox" },
  ],
  "lab-resources": [
    { key: "name", label: "Resource Name", type: "text", placeholder: "Oscilloscope" },
    { key: "resource_type", label: "Resource Type", type: "text", placeholder: "Equipment" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "lab_room_id", label: "Lab Room ID", type: "text", helper: "MongoDB _id of the lab room." },
    { key: "is_active", label: "Active Resource", type: "checkbox" },
  ],
};

function normalizePayload(resource: Resource, form: Record<string, FormValue>) {
  const payload: Record<string, unknown> = {};
  for (const field of fields[resource]) {
    const value = form[field.key];
    if (field.type === "checkbox") {
      payload[field.key] = Boolean(value);
    } else if (field.type === "number") {
      payload[field.key] = Number(value);
    } else if (field.key === "prerequisites") {
      payload[field.key] =
        typeof value === "string" && value.trim()
          ? value.split(",").map((item) => item.trim()).filter(Boolean)
          : [];
    } else if (field.optional && typeof value === "string" && !value.trim()) {
      payload[field.key] = null;
    } else {
      payload[field.key] = typeof value === "string" ? value.trim() : value;
    }
  }
  return payload;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (typeof value === "object") {
    if ("name" in value && typeof value.name === "string") return value.name;
    if ("code" in value && typeof value.code === "string") return value.code;
    return JSON.stringify(value);
  }
  return String(value);
}

function recordTitle(resource: Resource, item: Record<string, unknown>) {
  switch (resource) {
    case "departments":
      return displayValue(item.name);
    case "students":
      return displayValue(item.student_id);
    case "faculty":
      return displayValue(item.employee_id);
    case "courses":
      return `${displayValue(item.code)} - ${displayValue(item.name)}`;
    case "rooms":
      return displayValue(item.room_code);
    case "lab-resources":
      return displayValue(item.name);
  }
}

function recordSubtitle(resource: Resource, item: Record<string, unknown>) {
  switch (resource) {
    case "departments":
      return `${displayValue(item.code)} | ${displayValue(item.office_email)}`;
    case "students":
      return `${displayValue(item.program)} | Semester ${displayValue(item.semester)} | ${displayValue(item.batch)}`;
    case "faculty":
      return `${displayValue(item.designation)} | Workload ${displayValue(item.workload_limit)}`;
    case "courses":
      return `Credits ${displayValue(item.credits)} | Department ${displayValue(item.department_id)}`;
    case "rooms":
      return `${displayValue(item.building)} | ${displayValue(item.room_type)} | Capacity ${displayValue(item.capacity)}`;
    case "lab-resources":
      return `${displayValue(item.resource_type)} | Quantity ${displayValue(item.quantity)}`;
  }
}

export default function MasterDataClient() {
  const [resource, setResource] = useState<EditableResource>("departments");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, FormValue>>(templates.departments);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeFields = useMemo(() => fields[resource], [resource]);

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

  function changeResource(next: EditableResource) {
    setResource(next);
    setForm(templates[next]);
    setMessage(null);
    setError(null);
    void load(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const body = normalizePayload(resource, form);
      const res = await fetch(`/api/master-data/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to create record.");
      setMessage(`${singularResourceLabels[resource]} record created.`);
      setForm(templates[resource]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: string, value: FormValue) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Master Data"
        subtitle="Manage academic setup data. Student and faculty profiles are created through Create User so accounts, IDs, and departments stay consistent."
      />
      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      <div className="flex flex-wrap gap-2">
        {resources.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeResource(item)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              resource === item
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {resourceLabels[item]}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="cp-card space-y-4">
          <div>
            <p className="cp-section-title">Add {singularResourceLabels[resource]}</p>
            <p className="mt-1 text-sm text-zinc-500">{resourceDescriptions[resource]}</p>
          </div>

          <div className="grid gap-4">
            {activeFields.map((field) => {
              const value = form[field.key] ?? "";
              if (field.type === "checkbox") {
                return (
                  <label key={field.key} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => updateField(field.key, event.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{field.label}</span>
                      {field.helper ? <span className="block text-xs text-zinc-500">{field.helper}</span> : null}
                    </span>
                  </label>
                );
              }

              return (
                <div key={field.key}>
                  <label className="cp-label" htmlFor={`${resource}-${field.key}`}>
                    {field.label}
                    {field.optional ? <span className="font-normal text-zinc-400"> optional</span> : null}
                  </label>
                  {field.type === "select" ? (
                    <select
                      id={`${resource}-${field.key}`}
                      className="cp-select"
                      value={String(value)}
                      onChange={(event) => updateField(field.key, event.target.value)}
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={`${resource}-${field.key}`}
                      className="cp-textarea"
                      value={String(value)}
                      placeholder={field.placeholder}
                      onChange={(event) => updateField(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={`${resource}-${field.key}`}
                      className="cp-input"
                      type={field.type}
                      value={field.type === "number" ? Number(value) : String(value)}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        updateField(field.key, field.type === "number" ? Number(event.target.value) : event.target.value)
                      }
                    />
                  )}
                  {field.helper ? <p className="mt-1 text-xs text-zinc-500">{field.helper}</p> : null}
                </div>
              );
            })}
          </div>
          <button type="submit" disabled={loading} className="cp-btn-primary w-full">{loading ? "Saving..." : `Create ${singularResourceLabels[resource]}`}</button>
        </form>

        <div className="cp-card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="cp-section-title">{resourceLabels[resource]}</p>
              <p className="text-sm text-zinc-500">{items.length} record{items.length === 1 ? "" : "s"} found.</p>
            </div>
            <button type="button" onClick={() => void load()} className="cp-btn-secondary text-xs" disabled={loading}>
              Refresh
            </button>
          </div>
          {items.length === 0 ? <EmptyState title="No records" description="Create the first record for this resource." /> : null}
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={String(item._id)} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-900">{recordTitle(resource, item)}</p>
                    <p className="mt-1 text-sm text-zinc-500">{recordSubtitle(resource, item)}</p>
                  </div>
                  {"is_active" in item ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.is_active === false ? "bg-zinc-100 text-zinc-500" : "bg-emerald-50 text-emerald-700"}`}>
                      {item.is_active === false ? "Inactive" : "Active"}
                    </span>
                  ) : null}
                </div>
                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  {activeFields.slice(0, 6).map((field) => (
                    <div key={field.key} className="rounded-xl bg-zinc-50 px-3 py-2">
                      <dt className="font-medium text-zinc-500">{field.label}</dt>
                      <dd className="mt-1 wrap-break-word text-zinc-800">{displayValue(item[field.key])}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 break-all text-xs text-zinc-400">ID: {displayValue(item._id)}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
