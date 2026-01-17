import useSWR from "swr";
import { useState } from "react";
import ComposeModal from "../components/ComposeModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then(r => {
    if (!r.ok) throw new Error("failed");
    return r.json();
  });

export default function Dashboard() {
  const { data: scheduled, mutate: mutateScheduled } = useSWR(
    `${API}/emails/scheduled`,
    fetcher,
    { refreshInterval: 4000 }
  );
  const { data: sent } = useSWR(`${API}/emails/sent`, fetcher, {
    refreshInterval: 4000
  });
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">ReachInbox Dashboard</h1>
          <div className="flex items-center gap-2">
            <a href="/senders" className="py-2 px-3 border rounded">Manage Senders</a>
            <button
              onClick={() => setOpen(true)}
              className="py-2 px-3 bg-blue-600 text-white rounded"
            >
              Compose New Email
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white rounded shadow">
            <div className="p-4 border-b">
              <h2 className="font-medium">Scheduled Emails</h2>
            </div>
            <ul className="divide-y">
              {(scheduled ?? []).map((e: any) => (
                <li key={e.id} className="p-4">
                  <div className="font-medium">{e.subject}</div>
                  <div className="text-sm text-gray-600">{e.to_email}</div>
                  <div className="text-xs text-gray-500">{new Date(e.scheduled_at).toLocaleString()}</div>
                </li>
              ))}
              {(!scheduled || scheduled.length === 0) && (
                <li className="p-4 text-gray-500">No scheduled emails</li>
              )}
            </ul>
          </section>
          <section className="bg-white rounded shadow">
            <div className="p-4 border-b">
              <h2 className="font-medium">Sent Emails</h2>
            </div>
            <ul className="divide-y">
              {(sent ?? []).map((e: any) => (
                <li key={e.id} className="p-4">
                  <div className="font-medium">{e.subject}</div>
                  <div className="text-sm text-gray-600">{e.to_email}</div>
                  <div className="text-xs text-gray-500">{new Date(e.sent_at).toLocaleString()}</div>
                </li>
              ))}
              {(!sent || sent.length === 0) && (
                <li className="p-4 text-gray-500">No sent emails</li>
              )}
            </ul>
          </section>
        </div>
      </main>

      {open && (
        <ComposeModal
          onClose={() => setOpen(false)}
          onScheduled={() => {
            setOpen(false);
            mutateScheduled();
          }}
        />
      )}
    </div>
  );
}
