import React, { useEffect, useState } from "react";
import { api, setOwnerPin, clearOwnerPin } from "@/lib/api";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";

export default function OwnerSettings({ open, onClose, onMembersChanged, currentPin }) {
  const [tab, setTab] = useState("members");
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: "", role: "" });
  const [settings, setSettings] = useState({ team_name: "", passcode: "", owner_pin: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [ms, s] = await Promise.all([api.listMembers(), api.getSettingsFull()]);
        setMembers(ms);
        setSettings({
          team_name: s.team_name || "",
          passcode: s.passcode || "",
          owner_pin: s.owner_pin || "",
        });
      } catch {
        toast.error("Couldn't load settings — owner PIN may have expired.");
      }
    })();
  }, [open]);

  if (!open) return null;

  const addMember = async (e) => {
    e?.preventDefault?.();
    if (!newMember.name.trim()) return;
    setBusy(true);
    try {
      const m = await api.createMember({ name: newMember.name.trim(), role: newMember.role.trim() });
      setMembers((prev) => [...prev, m]);
      setNewMember({ name: "", role: "" });
      onMembersChanged?.();
      toast.success(`${m.name} added`);
    } catch {
      toast.error("Couldn't add member");
    } finally {
      setBusy(false);
    }
  };

  const saveMember = async (m, patch) => {
    try {
      const updated = await api.updateMember(m.id, patch);
      setMembers((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
      onMembersChanged?.();
    } catch {
      toast.error("Couldn't update member");
    }
  };

  const deleteMember = async (m) => {
    if (!window.confirm(`Remove ${m.name}?`)) return;
    try {
      await api.deleteMember(m.id);
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      onMembersChanged?.();
      toast.success(`${m.name} removed`);
    } catch {
      toast.error("Couldn't remove member");
    }
  };

  const saveSettings = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      await api.updateSettings(settings);
      // if owner pin was just changed, keep the session aligned
      setOwnerPin(settings.owner_pin);
      toast.success("Settings saved");
    } catch {
      toast.error("Couldn't save settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="owner-settings-overlay"
      className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center px-4 py-10 overflow-auto"
      onClick={onClose}
    >
      <div
        className="rl-card w-full max-w-2xl p-6 fade-up"
        onClick={(e) => e.stopPropagation()}
        data-testid="owner-settings-modal"
      >
        <div className="flex items-baseline justify-between mb-4">
          <div className="font-serif text-[20px] font-semibold">Owner settings</div>
          <button onClick={onClose} className="text-muted hover:text-ink text-[20px] leading-none" data-testid="settings-close">
            ×
          </button>
        </div>

        <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "#DCD7CC" }}>
          {[["members", "Members"], ["settings", "Passcode & PIN"]].map(([k, l]) => (
            <button
              key={k}
              data-testid={`settings-tab-${k}`}
              onClick={() => setTab(k)}
              className="rl-tab"
              data-active={tab === k}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "members" && (
          <div>
            <ul className="space-y-2 mb-5">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F7F4EC]"
                  data-testid={`member-row-${m.id}`}
                >
                  <Avatar member={m} size={28} />
                  <input
                    className="rl-input"
                    style={{ flex: 1 }}
                    value={m.name}
                    onChange={(e) => setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))}
                    onBlur={(e) => saveMember(m, { name: e.target.value })}
                    data-testid={`member-name-${m.id}`}
                  />
                  <input
                    className="rl-input"
                    style={{ flex: 1 }}
                    placeholder="Role"
                    value={m.role || ""}
                    onChange={(e) => setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, role: e.target.value } : x))}
                    onBlur={(e) => saveMember(m, { role: e.target.value })}
                    data-testid={`member-role-${m.id}`}
                  />
                  <button
                    onClick={() => deleteMember(m)}
                    className="rl-btn rl-btn-danger"
                    data-testid={`member-delete-${m.id}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={addMember} className="flex gap-2 items-end pt-4 border-t" style={{ borderColor: "#DCD7CC" }}>
              <div className="flex-1">
                <label className="block text-[11px] uppercase tracking-[0.08em] text-faint mb-1">New member name</label>
                <input
                  className="rl-input"
                  placeholder="e.g. Ananya"
                  value={newMember.name}
                  onChange={(e) => setNewMember((s) => ({ ...s, name: e.target.value }))}
                  data-testid="new-member-name"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] uppercase tracking-[0.08em] text-faint mb-1">Role</label>
                <input
                  className="rl-input"
                  placeholder="e.g. Junior analyst"
                  value={newMember.role}
                  onChange={(e) => setNewMember((s) => ({ ...s, role: e.target.value }))}
                  data-testid="new-member-role"
                />
              </div>
              <button disabled={busy || !newMember.name.trim()} className="rl-btn rl-btn-primary disabled:opacity-50" data-testid="new-member-add">
                Add
              </button>
            </form>
          </div>
        )}

        {tab === "settings" && (
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] text-faint mb-1">Team name</label>
              <input
                className="rl-input"
                value={settings.team_name}
                onChange={(e) => setSettings((s) => ({ ...s, team_name: e.target.value }))}
                data-testid="settings-team-name"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] text-faint mb-1">Team passcode</label>
              <input
                className="rl-input"
                value={settings.passcode}
                onChange={(e) => setSettings((s) => ({ ...s, passcode: e.target.value }))}
                data-testid="settings-passcode"
              />
              <div className="text-[11.5px] text-faint mt-1">Share with your team. They use this to enter the board.</div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] text-faint mb-1">Owner PIN</label>
              <input
                className="rl-input"
                value={settings.owner_pin}
                onChange={(e) => setSettings((s) => ({ ...s, owner_pin: e.target.value }))}
                data-testid="settings-owner-pin"
              />
              <div className="text-[11.5px] text-faint mt-1">Only you should know this. Used for admin actions.</div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="rl-btn rl-btn-ghost" onClick={() => { clearOwnerPin(); onClose(); }} data-testid="settings-lock">
                Lock owner mode
              </button>
              <button disabled={busy} className="rl-btn rl-btn-primary disabled:opacity-50" data-testid="settings-save">
                Save changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
