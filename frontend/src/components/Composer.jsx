import React, { useEffect, useMemo, useState } from "react";
import { TYPES, STATUS, STATUS_ORDER, RECUR, todayISO } from "@/lib/relay";

const initial = (me) => ({
  title: "",
  assignee: me?.id || "",
  assigned_by: me?.id || "",
  type: "Ad-hoc",
  status: "todo",
  assigned_date: todayISO(),
  due_date: todayISO(),
  recurrence: "none",
  repeat_until: "",
  note: "",
});

export default function Composer({ open, editing, members, me, onClose, onSave }) {
  const [f, setF] = useState(initial(me));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setF({
        title: editing.title || "",
        assignee: editing.assignee || me?.id,
        assigned_by: editing.assigned_by || me?.id,
        type: editing.type || "Ad-hoc",
        status: editing.status || "todo",
        assigned_date: editing.assigned_date || todayISO(),
        due_date: editing.due_date || todayISO(),
        recurrence: editing.recurrence || "none",
        repeat_until: editing.repeat_until || "",
        note: editing.note || "",
      });
    } else {
      setF(initial(me));
    }
  }, [open, editing, me]);

  if (!open) return null;

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!f.title.trim()) return;
    setBusy(true);
    try {
      await onSave(f);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="composer-overlay"
      className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center px-4 py-10 overflow-auto"
      onClick={onClose}
    >
      <div
        data-testid="composer-modal"
        className="rl-card w-full max-w-xl p-6 fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-serif text-[20px] font-semibold mb-5">
          {editing ? "Edit task" : "New task"}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="What needs doing">
            <input
              data-testid="composer-title"
              autoFocus
              className="rl-input"
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Weekly ecom funnel report"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assign to">
              <select
                data-testid="composer-assignee"
                className="rl-input"
                value={f.assignee}
                onChange={(e) => set("assignee", e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role || "team"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assigned by">
              <select
                data-testid="composer-assigned-by"
                className="rl-input"
                value={f.assigned_by}
                onChange={(e) => set("assigned_by", e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                data-testid="composer-type"
                className="rl-input"
                value={f.type}
                onChange={(e) => set("type", e.target.value)}
              >
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select
                data-testid="composer-status"
                className="rl-input"
                value={f.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS[s].label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assigned date">
              <input
                data-testid="composer-assigned-date"
                type="date"
                className="rl-input"
                value={f.assigned_date}
                onChange={(e) => set("assigned_date", e.target.value)}
              />
            </Field>
            <Field label="Due date">
              <input
                data-testid="composer-due-date"
                type="date"
                className="rl-input"
                value={f.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Repeat">
            <select
              data-testid="composer-recurrence"
              className="rl-input"
              value={f.recurrence}
              onChange={(e) => set("recurrence", e.target.value)}
            >
              {Object.entries(RECUR).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {f.recurrence !== "none" && (
              <div className="text-[11.5px] text-brand mt-1.5">
                When marked done, the next task auto-appears with a fresh due date.
              </div>
            )}
          </Field>
          {f.recurrence !== "none" && (
            <Field label="Repeat until (optional — blank = forever)">
              <input
                data-testid="composer-repeat-until"
                type="date"
                className="rl-input"
                value={f.repeat_until || ""}
                onChange={(e) => set("repeat_until", e.target.value)}
              />
            </Field>
          )}
          <Field label="Note (optional)">
            <input
              data-testid="composer-note"
              className="rl-input"
              value={f.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Any context…"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              data-testid="composer-cancel"
              className="rl-btn rl-btn-ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              data-testid="composer-save"
              type="submit"
              disabled={busy || !f.title.trim()}
              className="rl-btn rl-btn-primary disabled:opacity-50"
            >
              {editing ? "Save changes" : "Add task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <label className="block text-[11px] uppercase tracking-[0.08em] text-faint mb-1.5">{label}</label>
    {children}
  </div>
);
