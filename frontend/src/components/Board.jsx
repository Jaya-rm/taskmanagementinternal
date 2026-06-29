import React, { useMemo } from "react";
import TaskCard from "@/components/TaskCard";
import { Avatar } from "@/components/Avatar";
import { STATUS, STATUS_ORDER } from "@/lib/relay";

export default function Board({ tasks, members, me, isOwner, filters, groupBy, onUpdate, onComment, onEdit, onDelete }) {
  const filtered = useMemo(() => {
    const q = (filters.q || "").trim().toLowerCase();
    return tasks.filter((t) => {
      if (filters.person !== "all" && t.assignee !== filters.person) return false;
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.status === "open" && t.status === "done") return false;
      if (filters.status !== "open" && filters.status !== "all" && t.status !== filters.status) return false;
      if (q) {
        const hay = `${t.title} ${t.note || ""} ${t.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const groups = useMemo(() => {
    const sortFn = (a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999");
    if (groupBy === "none") return [{ key: "all", label: null, items: [...filtered].sort(sortFn) }];
    if (groupBy === "status") {
      return STATUS_ORDER.map((s) => ({
        key: s,
        label: STATUS[s].label,
        sub: null,
        color: STATUS[s].color,
        items: filtered.filter((t) => t.status === s).sort(sortFn),
      })).filter((g) => g.items.length);
    }
    return members
      .map((p) => ({
        key: p.id,
        label: p.name,
        sub: p.role,
        member: p,
        items: filtered.filter((t) => t.assignee === p.id).sort(sortFn),
      }))
      .filter((g) => g.items.length);
  }, [filtered, groupBy, members]);

  if (groups.length === 0) {
    return (
      <div className="rl-card p-10 text-center fade-up" data-testid="board-empty">
        <div className="font-serif text-[20px] font-semibold mb-1">No tasks match these filters.</div>
        <div className="text-muted text-[13px]">
          Try clearing filters or hit <span className="font-medium text-ink">New task</span>.
        </div>
      </div>
    );
  }

  return (
    <div data-testid="board-view">
      {groups.map((g) => (
        <section key={g.key} className="mb-6 fade-up" data-testid={`board-group-${g.key}`}>
          {g.label && (
            <header
              className="flex items-baseline gap-3 pb-2 mb-3 border-b"
              style={{ borderColor: "#DCD7CC" }}
            >
              {g.member && <Avatar member={g.member} size={24} />}
              <span className="font-serif text-[16px] font-semibold" style={{ color: g.color || "#1E1B16" }}>
                {g.label}
              </span>
              {g.sub && <span className="text-[11.5px] text-faint">{g.sub}</span>}
              <span className="ml-auto text-[12px] text-muted">{g.items.length}</span>
            </header>
          )}
          <div className="grid gap-2.5">
            {g.items.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                members={members}
                me={me}
                isOwner={isOwner}
                onChange={async (patch) => {
                  if (patch.__comment) {
                    return onComment(t.id, patch.__comment.author, patch.__comment.text);
                  }
                  return onUpdate(t.id, patch);
                }}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
