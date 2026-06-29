import React, { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { fmtDate, todayISO } from "@/lib/relay";

const addDays = (iso, n) => {
  const d = new Date((iso || todayISO()) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function DayReport({ tasks, members }) {
  const [day, setDay] = useState(todayISO());
  const isToday = day === todayISO();

  const byPerson = useMemo(() => {
    const map = new Map();
    members.forEach((m) => map.set(m.id, []));
    tasks.forEach((t) => {
      const due = t.due_date === day;
      const assigned = t.assigned_date === day;
      const updated = (t.history || []).some((h) => (h.ts || "").slice(0, 10) === day);
      if (due || assigned || updated) {
        if (map.has(t.assignee)) map.get(t.assignee).push(t);
      }
    });
    return map;
  }, [tasks, members, day]);

  return (
    <div data-testid="day-view">
      <div className="flex items-center justify-center gap-3 mb-5">
        <button
          data-testid="day-prev"
          onClick={() => setDay(addDays(day, -1))}
          className="rl-btn rl-btn-ghost h-9 w-9 p-0"
        >
          ‹
        </button>
        <div className="text-center min-w-[180px]">
          <div className="font-serif text-[19px] font-semibold">
            {isToday ? "Today" : fmtDate(day)}
          </div>
          <div className="text-[11.5px] text-faint">
            {isToday ? fmtDate(day) : day > todayISO() ? "upcoming" : "past"}
          </div>
        </div>
        <button
          data-testid="day-next"
          onClick={() => setDay(addDays(day, 1))}
          className="rl-btn rl-btn-ghost h-9 w-9 p-0"
        >
          ›
        </button>
        {!isToday && (
          <button
            data-testid="day-today"
            onClick={() => setDay(todayISO())}
            className="rl-btn rl-btn-ghost"
          >
            Jump to today
          </button>
        )}
      </div>

      <div className="grid gap-3">
        {members.map((p) => {
          const items = byPerson.get(p.id) || [];
          return (
            <section key={p.id} className="rl-card p-4" data-testid={`day-section-${p.id}`}>
              <header className="flex items-center gap-2.5 mb-2">
                <Avatar member={p} size={26} />
                <div className="font-serif text-[15px] font-semibold">{p.name}</div>
                <div className="text-[11.5px] text-faint">{p.role}</div>
                <div className="ml-auto text-[12px] text-muted">{items.length} item{items.length === 1 ? "" : "s"}</div>
              </header>
              {items.length === 0 ? (
                <div className="text-[12.5px] text-faint italic">Nothing scheduled.</div>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((t) => (
                    <li key={t.id} className="text-[13px] text-ink">
                      <span className="font-medium">{t.title}</span>
                      <span className="text-muted"> · {t.type}</span>
                      <span className="text-faint"> · due {fmtDate(t.due_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
