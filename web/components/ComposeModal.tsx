import { useEffect, useState } from "react";

type Props = {
  onClose: () => void;
  onScheduled: () => void;
};

export default function ComposeModal({ onClose, onScheduled }: Props) {
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [senderId, setSenderId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [senders, setSenders] = useState<any[]>([]);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/senders`, { credentials: "include" });
        if (r.ok) {
          const data = await r.json();
          setSenders(data);
          if (data.length > 0) setSenderId(data[0].id);
        }
      } catch {}
    })();
  }, []);

  const schedule = async () => {
    setLoading(true);
    const r = await fetch(`${API}/emails/schedule`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ toEmail, subject, body, senderId, scheduledAt })
    });
    setLoading(false);
    if (r.ok) onScheduled();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded shadow w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="font-medium">Compose New Email</div>
          <button onClick={onClose} className="text-gray-600">Close</button>
        </div>
        <div className="p-4 space-y-3">
          <input
            value={toEmail}
            onChange={e => setToEmail(e.target.value)}
            placeholder="To"
            className="w-full border rounded px-3 py-2"
          />
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Body"
            className="w-full border rounded px-3 py-2 h-32"
          />
          <div>
            <label className="block text-sm mb-1">Sender</label>
            <select
              value={senderId}
              onChange={e => setSenderId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {senders.map(s => (
                <option key={s.id} value={s.id}>
                  {s.from_name} &lt;{s.from_email}&gt;
                </option>
              ))}
            </select>
          </div>
          <input
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            placeholder="Schedule datetime (ISO)"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          <button
            onClick={schedule}
            disabled={loading}
            className="px-3 py-2 rounded bg-blue-600 text-white"
          >
            {loading ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
