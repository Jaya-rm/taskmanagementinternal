import React, { useCallback, useEffect, useMemo, useState } from "react";
import "@/App.css";
import { Toaster, toast } from "sonner";
import { api, getOwnerPin, clearOwnerPin } from "@/lib/api";
import { TYPES, STATUS, STATUS_ORDER } from "@/lib/relay";
import AuthGate from "@/components/AuthGate";
import Board from "@/components/Board";
import DayReport from "@/components/DayReport";
import LogView from "@/components/LogView";
import Composer from "@/components/Composer";
import ReminderStrip from "@/components/ReminderStrip";
import OwnerSettings from "@/components/OwnerSettings";
import OwnerPinPrompt from "@/components/OwnerPinPrompt";
import { Avatar } from "@/components/Avatar";

const ME_KEY = "relay:me";

function AppShell() {
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teamName, setTeamName] = useState("Category team");
  const [tab, setTab] = useState("board");
  const [filters, setFilters] = useState({ q: "", person: "all", status: "open", type: "all" });
  const [groupBy, setGroupBy] = useState("person");
  const [composer, setComposer] = useState({ open: false, editing: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingOwnerAction, setPendingOwnerAction] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [logKey, setLogKey] = useState(0);

  // Initial verify owner pin if present
  useEffect(() => {
    (async () => {
      const pin = getOwnerPin();
      if (pin) {
        try {
          const ok = await api.checkOwnerPin(pin);
          setIsOwner(ok);
          if (!ok) clearOwnerPin();
        } catch {
          setIsOwner(false);
        }
      }
      try {
        const s = await api.getSettings();
        setTeamName(s.team_name || "Category team");
      } catch (e) {
        // settings load is non-critical
      }
    })();
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const t = await api.listTasks();
      setTasks(t);
    } catch {
      toast.error("Couldn't load tasks");
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const m = await api.listMembers();
      setMembers(m);
      // refresh "me" reference
      const meId = localStorage.getItem(ME_KEY);
      const found = m.find((x) => x.id === meId);
      if (found) setMe(found);
    } catch {
      toast.error("Couldn't load members");
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    loadTasks();
    const t = setInterval(loadTasks, 15000);
    return () => clearInterval(t);
  }, [me, loadTasks]);

  const handleAuth = (member, ms) => {
    setMembers(ms);
    setMe(member);
  };

  const switchMe = (id) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    localStorage.setItem(ME_KEY, m.id);
    setMe(m);
  };

  const askOwner = (action) => {
    if (isOwner) {
      action();
      return;
    }
    setPendingOwnerAction(() => action);
    setPinOpen(true);
  };

  const onOwnerUnlocked = () => {
    setIsOwner(true);
    if (pendingOwnerAction) {
      const fn = pendingOwnerAction;
      setPendingOwnerAction(null);
      fn();
    }
  };

  const lockOwner = () => {
    clearOwnerPin();
    setIsOwner(false);
    toast("Owner mode locked");
  };

  // ----- Task CRUD -----
  const saveTask = async (data) => {
    if (composer.editing) {
      const updated = await api.updateTask(composer.editing.id, { ...data, actor: me.id });
      setTasks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success("Task updated");
    } else {
      const created = await api.createTask(data, me.id);
      setTasks((prev) => [created, ...prev]);
      toast.success("Task added");
    }
    setLogKey((k) => k + 1);
  };

  const updateTask = async (id, patch) => {
    const updated = await api.updateTask(id, { ...patch, actor: me.id });
    setTasks((prev) => {
      const exists = prev.some((x) => x.id === updated.id);
      const next = exists ? prev.map((x) => (x.id === updated.id ? updated : x)) : [updated, ...prev];
      // If status changed to done with recurrence, server spawns a new task — refresh list
      if (patch.status === "done") {
        api.listTasks().then((t) => setTasks(t)).catch(() => {});
      }
      return next;
    });
    setLogKey((k) => k + 1);
    return updated;
  };

  const commentTask = async (id, author, text) => {
    const { task, spawned } = await api.addComment(id, author, text);
    setTasks((prev) => {
      let next = prev.map((x) => (x.id === task.id ? task : x));
      if (spawned?.length) next = [...spawned, ...next];
      return next;
    });
    setLogKey((k) => k + 1);
    return { spawned };
  };

  const deleteTask = (task) => {
    askOwner(async () => {
      try {
        await api.deleteTask(task.id);
        setTasks((prev) => prev.filter((x) => x.id !== task.id));
        toast.success("Task deleted");
        setLogKey((k) => k + 1);
      } catch {
        toast.error("Couldn't delete");
      }
    });
  };

  const onMembersChanged = async () => {
    await loadMembers();
    setLogKey((k) => k + 1);
  };

  if (!me) {
    return (
      <>
        <AuthGate onAuth={handleAuth} />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <div className="paper-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-5 py-7">
        <header className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div>
            <div className="font-serif text-[30px] font-semibold tracking-tight leading-none text-ink">
              Task Relay
            </div>
            <div className="text-[12.5px] text-muted mt-1.5 tracking-wide">
              {teamName} · comments become tasks · every change is logged
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-[0.08em] text-faint">You are</span>
            <select
              data-testid="header-me-select"
              className="rl-input"
              style={{ width: "auto" }}
              value={me.id}
              onChange={(e) => switchMe(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              data-testid="header-new-task"
              className="rl-btn rl-btn-primary"
              onClick={() => setComposer({ open: true, editing: null })}
            >
              + New task
            </button>
            {isOwner ? (
              <>
                <button
                  data-testid="header-settings"
                  className="rl-btn rl-btn-ghost"
                  onClick={() => setSettingsOpen(true)}
                >
                  Settings
                </button>
                <button
                  data-testid="header-lock-owner"
                  className="rl-btn rl-btn-ghost"
                  onClick={lockOwner}
                  title="Lock owner mode"
                >
                  Lock
                </button>
              </>
            ) : (
              <button
                data-testid="header-unlock-owner"
                className="rl-btn rl-btn-ghost"
                onClick={() => askOwner(() => setSettingsOpen(true))}
              >
                Owner mode
              </button>
            )}
          </div>
        </header>

        <div
          className="inline-flex gap-1 mb-4 p-1 border rounded-xl"
          style={{ borderColor: "#DCD7CC", background: "#FBFAF6" }}
        >
          {[["board", "Board"], ["day", "Day report"], ["log", "Log"]].map(([k, l]) => (
            <button
              key={k}
              data-testid={`tab-${k}`}
              data-active={tab === k}
              onClick={() => setTab(k)}
              className="rl-tab"
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "board" && (
          <>
            <ReminderStrip
              tasks={tasks}
              onJump={(t) => {
                setFilters((f) => ({ ...f, q: "", person: "all", status: "all", type: "all" }));
                // Bring user attention with a toast
                toast(`"${t.title}"`, { description: `Assigned to ${members.find((m) => m.id === t.assignee)?.name || "—"}` });
              }}
            />
            <div className="flex gap-2 flex-wrap items-center mb-4">
              <input
                data-testid="filter-search"
                className="rl-input"
                placeholder="Search tasks…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                style={{ flex: "1 1 200px", minWidth: 160 }}
              />
              <Seg label="Person" value={filters.person} onChange={(v) => setFilters((f) => ({ ...f, person: v }))} opts={[["all", "Everyone"], ...members.map((m) => [m.id, m.name])]} testId="filter-person" />
              <Seg label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} opts={[["open", "Open"], ["all", "All"], ...STATUS_ORDER.map((s) => [s, STATUS[s].label])]} testId="filter-status" />
              <Seg label="Type" value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} opts={[["all", "All types"], ...TYPES.map((t) => [t, t])]} testId="filter-type" />
              <Seg label="Group" value={groupBy} onChange={setGroupBy} opts={[["person", "By person"], ["status", "By status"], ["none", "Flat"]]} testId="filter-group" />
            </div>

            <Board
              tasks={tasks}
              members={members}
              me={me}
              isOwner={isOwner}
              filters={filters}
              groupBy={groupBy}
              onUpdate={updateTask}
              onComment={commentTask}
              onEdit={(t) => setComposer({ open: true, editing: t })}
              onDelete={deleteTask}
            />
          </>
        )}

        {tab === "day" && <DayReport tasks={tasks} members={members} />}
        {tab === "log" && <LogView refreshKey={logKey} />}

        <footer className="mt-12 mb-4 text-center text-[11.5px] text-faint">
          You are signed in as <span className="text-ink font-medium">{me.name}</span>
          {isOwner && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-soft text-brand text-[10.5px] uppercase tracking-wider">Owner</span>}
        </footer>
      </div>

      <Composer
        open={composer.open}
        editing={composer.editing}
        members={members}
        me={me}
        onClose={() => setComposer({ open: false, editing: null })}
        onSave={saveTask}
      />
      <OwnerSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onMembersChanged={onMembersChanged}
      />
      <OwnerPinPrompt
        open={pinOpen}
        onClose={() => { setPinOpen(false); setPendingOwnerAction(null); }}
        onUnlock={onOwnerUnlocked}
      />
      <Toaster position="bottom-right" />
    </div>
  );
}

const Seg = ({ label, value, onChange, opts, testId }) => (
  <div className="inline-flex items-center gap-1.5">
    <span className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</span>
    <select
      data-testid={testId}
      className="rl-input"
      style={{ width: "auto", padding: "6px 10px", fontSize: 12.5 }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {opts.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  </div>
);

export default function App() {
  return <AppShell />;
}
