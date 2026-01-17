import { useEffect, useState } from "react";
import Link from "next/link";

export default function Senders() {
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [senders, setSenders] = useState<any[]>([]);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const load = async () => {
    const r = await fetch(`${API}/senders`, { credentials: "include" });
    if (r.ok) setSenders(await r.json());
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const r = await fetch(`${API}/senders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fromEmail, fromName })
    });
    if (r.ok) {
      setFromEmail("");
      setFromName("");
      load();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Senders</h1>
          <Link href="/dashboard" className="text-blue-600">Back to Dashboard</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="p-4 bg-white rounded shadow space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={fromName}
              onChange={e => setFromName(e.target.value)}
              placeholder="From Name"
              className="border rounded px-3 py-2"
            />
            <input
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              placeholder="From Email"
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex justify-end">
            <button onClick={create} className="px-3 py-2 bg-blue-600 text-white rounded">Save Sender</button>
          </div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-medium mb-2">Your Senders</h2>
          <ul className="divide-y">
            {senders.map(s => (
              <li key={s.id} className="py-2">
                {s.from_name} &lt;{s.from_email}&gt;
              </li>
            ))}
            {senders.length === 0 && <li className="py-2 text-gray-500">No senders yet</li>}
          </ul>
        </div>
      </main>
    </div>
  );
}
