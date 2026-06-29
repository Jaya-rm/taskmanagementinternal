import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtTime } from "@/lib/relay";

const KIND_LABEL = {
  task_create: "Created",
  task_delete: "Deleted",
  status_change: "Status",
  reassign: "Reassigned",
  comment: "Comment",
  handoff_create: "Handoff",
  recur_create: "Recurred",
  member_create: "Member added",
  member_delete: "Member removed",
};

export default function LogView({ refreshKey }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.listLogs();
        setLogs(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

  return (
    <div data-testid="log-view">
      <div className="rl-card p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="font-serif text-[18px] font-semibold">Activity log</div>
          <div className="text-[11.5px] text-faint">{logs.length} entries</div>
        </div>
        {loading ? (
          <div className="text-faint text-[13px] italic">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-faint text-[13px] italic">No activity yet.</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "#DCD7CC" }}>
            {logs.map((l) => (
              <li key={l.id} className="py-2 flex items-start gap-3" data-testid={`log-row-${l.id}`}>
                <div className="text-[11.5px] text-faint w-[140px] shrink-0">{fmtTime(l.ts)}</div>
                <div
                  className="text-[11px] uppercase tracking-[0.08em] w-[100px] shrink-0"
                  style={{ color: "#1F4D46" }}
                >
                  {KIND_LABEL[l.kind] || l.kind}
                </div>
                <div className="text-[13px] text-ink flex-1">{l.text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
