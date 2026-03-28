"use client";

import { useEffect, useState } from "react";

type TicketItem = {
  _id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  created_at?: string;
};

type TicketListClientProps = {
  adminMode?: boolean;
};

const statuses = ["pending", "in_review", "approved", "rejected", "completed", "escalated"] as const;

export default function TicketListClient({ adminMode = false }: TicketListClientProps) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tickets");
      const payload = (await response.json()) as { tickets?: TicketItem[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load tickets.");
      }
      setTickets(payload.tickets ?? []);
    } catch (loadError) {
      const msg = loadError instanceof Error ? loadError.message : "Failed to load tickets.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function updateStatus(ticketId: string, status: (typeof statuses)[number]) {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Status update failed.");
      }
      await loadTickets();
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : "Status update failed.";
      setError(msg);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">
          {adminMode ? "Admin Ticket Dashboard" : "My Tickets"}
        </h2>
        <button
          onClick={() => void loadTickets()}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="text-sm text-zinc-600">Loading tickets...</p> : null}
      {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
      {!loading && tickets.length === 0 ? (
        <p className="text-sm text-zinc-600">No tickets found.</p>
      ) : null}

      {!loading && tickets.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-600">
                <th className="py-2">Title</th>
                <th className="py-2">Type</th>
                <th className="py-2">Priority</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created</th>
                {adminMode ? <th className="py-2">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket._id} className="border-b border-zinc-100">
                  <td className="py-2 pr-3 text-zinc-900">{ticket.title}</td>
                  <td className="py-2 pr-3">{ticket.type}</td>
                  <td className="py-2 pr-3">{ticket.priority}</td>
                  <td className="py-2 pr-3">{ticket.status}</td>
                  <td className="py-2 pr-3">
                    {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "-"}
                  </td>
                  {adminMode ? (
                    <td className="py-2 pr-3">
                      <select
                        value={ticket.status}
                        onChange={(event) =>
                          void updateStatus(ticket._id, event.target.value as (typeof statuses)[number])
                        }
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                      >
                        {statuses.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
