"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type Task = {
  _id: string;
  entity_type: string;
  entity_id: string;
  task_type: string;
  assigned_to: string;
  due_date?: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: string;
};

const statuses = ["pending", "in_progress", "completed", "cancelled"] as const;
const entityTypes = ["ticket", "document", "schedule", "approval"] as const;

export default function WorkflowTasksClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState({ entity_type: "ticket", entity_id: "", task_type: "", assigned_to: "", due_date: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow-tasks?limit=50");
      const payload = (await res.json()) as { tasks?: Task[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load workflow tasks.");
      setTasks(payload.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/workflow-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, due_date: form.due_date ? new Date(form.due_date).toISOString() : null }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Task creation failed.");
      setMessage("Workflow task created and assignee notified.");
      setForm({ entity_type: "ticket", entity_id: "", task_type: "", assigned_to: "", due_date: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task creation failed.");
    }
  }

  async function updateStatus(id: string, status: Task["status"]) {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/workflow-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Task update failed.");
      setMessage("Workflow task updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task update failed.");
    }
  }

  async function sendReminders() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/workflow-tasks/reminders", { method: "POST" });
    const payload = (await res.json()) as { reminded_count?: number; error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Reminder dispatch failed.");
      return;
    }
    setMessage(`Reminder dispatch complete. Sent: ${payload.reminded_count ?? 0}.`);
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Workflow Tasks"
        subtitle="Track pending actions, ownership, and reminder dispatch for department workflows."
        actions={<button type="button" onClick={() => void sendReminders()} className="cp-btn-secondary text-xs">Send Due Reminders</button>}
      />
      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      <form onSubmit={createTask} className="cp-card grid gap-4 md:grid-cols-2">
        <select value={form.entity_type} onChange={(e) => setForm((p) => ({ ...p, entity_type: e.target.value }))} className="cp-select">
          {entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input value={form.entity_id} onChange={(e) => setForm((p) => ({ ...p, entity_id: e.target.value }))} placeholder="Entity ID" className="cp-input" required />
        <input value={form.task_type} onChange={(e) => setForm((p) => ({ ...p, task_type: e.target.value }))} placeholder="Task type" className="cp-input" required />
        <input value={form.assigned_to} onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))} placeholder="Assigned user ID" className="cp-input" required />
        <input type="datetime-local" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="cp-input" />
        <button type="submit" className="cp-btn-primary">Create Task</button>
      </form>

      <div className="cp-card space-y-3">
        <p className="cp-section-title">Current tasks</p>
        {loading ? <InlineAlert tone="info" message="Loading workflow tasks..." /> : null}
        {!loading && tasks.length === 0 ? <EmptyState title="No workflow tasks" description="Create tasks for pending approvals, documents, tickets, or schedule actions." /> : null}
        {tasks.map((task) => (
          <article key={task._id} className="cp-card-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-zinc-900">{task.task_type}</p>
                <StatusBadge label={task.status} />
                <StatusBadge label={task.priority} tone="info" />
              </div>
              <p className="mt-1 text-xs text-zinc-500">{task.entity_type}: {task.entity_id} · assigned to {task.assigned_to}</p>
              {task.due_date ? <p className="mt-1 text-xs text-zinc-500">Due {new Date(task.due_date).toLocaleString()}</p> : null}
            </div>
            <select value={task.status} onChange={(e) => void updateStatus(task._id, e.target.value as Task["status"])} className="cp-select w-auto">
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </article>
        ))}
      </div>
    </section>
  );
}
