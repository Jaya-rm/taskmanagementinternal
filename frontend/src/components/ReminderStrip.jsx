import React from "react";
import { dueState, fmtDate, STATUS } from "@/lib/relay";

const Pill = ({ label, items, color, soft, testId, onJump }) => (
  <div
    data-testid={testId}
    className="rounded-xl border px-4 py-3 flex-1 min-w-[210px]"
    style={{ borderColor: "#DCD7CC", background: soft }}
  >
    <div className="flex items-baseline gap-2">
      <span className="font-serif text-[15px] font-semibold" style={{ color }}>
        {items.length}
      </span>
      <span className="text-[11.5px] uppercase tracking-[0.08em]" style={{ color }}>
        {label}
      </span>
    </div>
    <ul className="mt-2 space-y-1.5">
      {items.slice(0, 3).map((t) => (
        <li key={t.id} className="text-[12.5px] text-ink leading-snug">
          <button
            data-testid={`reminder-jump-${t.id}`}
            onClick={() => onJump(t)}
            className="text-left hover:underline"
          >
            {t.title}
            <span className="text-faint"> · {fmtDate(t.due_date)}</span>
          </button>
        </li>
      ))}
      {items.length > 3 && (
        <li className="text-[11.5px] text-faint">+{items.length - 3} more</li>
      )}
    </ul>
  </div>
);

export default function ReminderStrip({ tasks, onJump }) {
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => dueState(t.due_date) === "overdue");
  const today = open.filter((t) => dueState(t.due_date) === "today");
  const blocked = open.filter((t) => t.status === "blocked");

  if (!overdue.length && !today.length && !blocked.length) return null;

  return (
    <div className="flex gap-3 flex-wrap mb-4 fade-up" data-testid="reminder-strip">
      {overdue.length > 0 && (
        <Pill label="Overdue" items={overdue} color={STATUS.blocked.color} soft={STATUS.blocked.soft} testId="reminder-overdue" onJump={onJump} />
      )}
      {today.length > 0 && (
        <Pill label="Due today" items={today} color={STATUS.doing.color} soft={STATUS.doing.soft} testId="reminder-today" onJump={onJump} />
      )}
      {blocked.length > 0 && (
        <Pill label="Blocked" items={blocked} color={STATUS.blocked.color} soft={STATUS.blocked.soft} testId="reminder-blocked" onJump={onJump} />
      )}
    </div>
  );
}
