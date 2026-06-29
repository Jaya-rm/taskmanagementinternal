import React, { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { STATUS, STATUS_ORDER, RECUR, fmtDate, fmtTime, dueState } from "@/lib/relay";
import { toast } from "sonner";

export default function TaskCard({ task, members, me, isOwner, onChange, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  const byId = (id) => members.find((m) => m.id === id) || { id, name: id || "—", role: "" };
  const assignee = byId(task.assignee);
  const assignedBy = byId(task.assigned_by);
  const st = STATUS[task.status] || STATUS.todo;
  const ds = dueState(task.due_date);
  const dueColor =
    task.status === "done"
      ? "#9A9388"
      : ds === "overdue"
      ? "#C24B3A"
      : ds === "today"
      ? "#B5791D"
      : ds === "soon"
      ? "#3F6FA0"
      : "#726C61";

  const setStatus = async (s) => {
    if (s === task.status) return;
    await onChange({ status: s });
    if (s === "done") toast.success("Marked done");
  };

  const sendComment = async (e) => {
    e?.preventDefault?.();
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      const { spawned } = await onChange({ __comment: { author: me.id, text: commentText.trim() } });
      setCommentText("");
      if (spawned?.length) {
        toast.success(`Handoff task created · ${spawned.length}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const renderComment = (cm) => {
    const author = byId(cm.author);
    const parts = (cm.text || "").split(/(@\w+)/g);
    return (
      <div key={cm.id} className="flex gap-2 py-1.5" data-testid={`comment-${cm.id}`}>
        <Avatar member={author} size={22} />
        <div className="flex-1">
          <div className="text-[11.5px] text-faint">
            {author.name} · {fmtTime(cm.ts)}
          </div>
          <div className="text-[13.5px] text-ink leading-snug mt-0.5">
            {parts.map((p, i) =>
              /^@\w+$/.test(p) ? (
                <span
                  key={i}
                  className="font-semibold"
                  style={{ color: "#3F6FA0", background: "#E2EAF2", padding: "0 4px", borderRadius: 4 }}
                >
                  {p}
                </span>
              ) : (
                <span key={i}>{p}</span>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <article
      data-testid={`task-card-${task.id}`}
      className="rl-card p-4 hover:shadow-sm transition-shadow"
      style={{ borderLeft: `3px solid ${st.color}` }}
    >
      <div className="flex items-start gap-3">
        <Avatar member={assignee} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div
                className={`font-serif text-[16px] font-semibold leading-snug ${
                  task.status === "done" ? "line-through text-faint" : "text-ink"
                }`}
                data-testid={`task-title-${task.id}`}
              >
                {task.title}
              </div>
              <div className="text-[11.5px] text-muted mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>{assignee.name}</span>
                <span className="text-faint">·</span>
                <span>{task.type}</span>
                <span className="text-faint">·</span>
                <span>
                  by <span className="text-ink">{assignedBy.name}</span>
                </span>
                {task.recurrence && task.recurrence !== "none" && (
                  <>
                    <span className="text-faint">·</span>
                    <span>{RECUR[task.recurrence]?.label}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[11.5px] font-medium"
                style={{ color: dueColor }}
                data-testid={`task-due-${task.id}`}
              >
                {ds === "overdue" && "Overdue · "}
                {ds === "today" && "Today · "}
                {fmtDate(task.due_date)}
              </span>
              <select
                data-testid={`task-status-${task.id}`}
                value={task.status}
                onChange={(e) => setStatus(e.target.value)}
                className="rl-input"
                style={{
                  padding: "5px 8px",
                  width: "auto",
                  fontSize: 12,
                  background: st.soft,
                  color: st.color,
                  borderColor: st.color + "44",
                  fontWeight: 600,
                }}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {task.note && (
            <div className="text-[12.5px] text-muted mt-2 leading-relaxed">{task.note}</div>
          )}

          <div className="mt-3 flex items-center gap-3">
            <button
              data-testid={`task-toggle-${task.id}`}
              onClick={() => setOpen((v) => !v)}
              className="text-[12px] text-bluey hover:underline"
            >
              {open ? "Hide" : "Open"} · {task.comments?.length || 0} comments
            </button>
            <button
              data-testid={`task-edit-${task.id}`}
              onClick={() => onEdit(task)}
              className="text-[12px] text-muted hover:text-ink hover:underline"
            >
              Edit
            </button>
            {isOwner && (
              <button
                data-testid={`task-delete-${task.id}`}
                onClick={() => {
                  if (window.confirm(`Delete "${task.title}"?`)) onDelete(task);
                }}
                className="text-[12px] text-urgent hover:underline"
              >
                Delete
              </button>
            )}
          </div>

          {open && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "#DCD7CC" }}>
              <div className="text-[11px] uppercase tracking-[0.08em] text-faint mb-1">
                Comments
              </div>
              <div className="max-h-56 overflow-auto pr-1">
                {(task.comments || []).length === 0 && (
                  <div className="text-[12.5px] text-faint italic">
                    No comments yet. Try @mentioning a teammate to spawn a handoff.
                  </div>
                )}
                {(task.comments || []).map(renderComment)}
              </div>
              <form onSubmit={sendComment} className="mt-2 flex gap-2">
                <input
                  data-testid={`comment-input-${task.id}`}
                  className="rl-input"
                  placeholder="Add a comment… use @name to spawn a handoff"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button
                  data-testid={`comment-send-${task.id}`}
                  disabled={busy || !commentText.trim()}
                  className="rl-btn rl-btn-primary disabled:opacity-50"
                >
                  Send
                </button>
              </form>

              {(task.history || []).length > 0 && (
                <details className="mt-3 group">
                  <summary className="text-[11px] uppercase tracking-[0.08em] text-faint cursor-pointer">
                    History ({task.history.length})
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {task.history.map((h, i) => (
                      <li key={i} className="text-[12px] text-muted">
                        {fmtTime(h.ts)} · {h.kind}
                        {h.from ? ` ${h.from} →` : ""} {h.to || ""}
                        {h.actor ? ` · by ${byId(h.actor).name}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
