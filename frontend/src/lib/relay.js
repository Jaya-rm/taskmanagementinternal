export const TYPES = [
  "Report", "Ecom", "Cataloguing", "Survey",
  "Retention calling", "Design", "Graphic design", "Ad-hoc", "Handoff",
];

export const STATUS = {
  todo: { label: "Not started", color: "#9A9388", soft: "#EDEAE3" },
  doing: { label: "In progress", color: "#B5791D", soft: "#F4E9D4" },
  waiting: { label: "Waiting on someone", color: "#3F6FA0", soft: "#E2EAF2" },
  blocked: { label: "Blocked", color: "#C24B3A", soft: "#F6E3DF" },
  done: { label: "Done", color: "#1F4D46", soft: "#E4ECE8" },
};
export const STATUS_ORDER = ["todo", "doing", "waiting", "blocked", "done"];

export const RECUR = {
  none: { label: "One-off" },
  daily: { label: "Daily" },
  every2days: { label: "Every 2 days" },
  weekly: { label: "Weekly" },
  biweekly: { label: "Every 2 weeks" },
  monthly: { label: "Monthly" },
  weekdays: { label: "Every weekday" },
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

export const fmtTime = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const dueState = (due) => {
  if (!due) return "none";
  const today = todayISO();
  if (due < today) return "overdue";
  if (due === today) return "today";
  const d = new Date(due + "T00:00:00");
  const t = new Date(today + "T00:00:00");
  const diff = Math.round((d - t) / (1000 * 60 * 60 * 24));
  if (diff <= 2) return "soon";
  return "later";
};

export const initials = (name) => (name || "?")
  .split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

export const avatarColor = (id) => {
  const palette = ["#1F4D46", "#3F6FA0", "#B5791D", "#C24B3A", "#8A6D3B", "#5C6F4A", "#7A4E6A", "#46627E"];
  let h = 0;
  for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
};
