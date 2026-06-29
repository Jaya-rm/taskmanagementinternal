import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const SESSION_KEY = "relay:session";
const ME_KEY = "relay:me";

export default function AuthGate({ onAuth }) {
  const [stage, setStage] = useState("loading"); // loading | passcode | pick
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState([]);
  const [pickedId, setPickedId] = useState("");
  const [teamName, setTeamName] = useState("Category team");

  useEffect(() => {
    (async () => {
      try {
        const s = await api.getSettings();
        setTeamName(s.team_name || "Category team");
      } catch (e) {
        // non-blocking
      }
      const sess = localStorage.getItem(SESSION_KEY);
      if (sess === "ok") {
        const ms = await api.listMembers();
        setMembers(ms);
        const me = localStorage.getItem(ME_KEY);
        const found = me && ms.find((m) => m.id === me);
        if (found) {
          onAuth(found, ms);
          return;
        }
        setPickedId(ms[0]?.id || "");
        setStage("pick");
      } else {
        setStage("passcode");
      }
    })();
  }, [onAuth]);

  const submitPasscode = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      const ok = await api.checkPasscode(passcode.trim());
      if (!ok) {
        toast.error("That passcode didn't work.");
        setBusy(false);
        return;
      }
      localStorage.setItem(SESSION_KEY, "ok");
      const ms = await api.listMembers();
      setMembers(ms);
      setPickedId(ms[0]?.id || "");
      setStage("pick");
    } catch (err) {
      toast.error("Connection issue. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitPick = (e) => {
    e?.preventDefault?.();
    const m = members.find((x) => x.id === pickedId);
    if (!m) return;
    localStorage.setItem(ME_KEY, m.id);
    onAuth(m, members);
  };

  if (stage === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-faint" data-testid="auth-loading">
        Loading…
      </div>
    );
  }

  return (
    <div className="paper-bg min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md fade-up">
        <div className="mb-7">
          <div className="font-serif text-4xl font-semibold tracking-tight text-ink leading-none">
            Task Relay
          </div>
          <div className="mt-3 text-[12.5px] text-muted tracking-wide uppercase">
            {teamName} · the team task board
          </div>
        </div>

        {stage === "passcode" && (
          <form onSubmit={submitPasscode} className="rl-card p-7 space-y-5" data-testid="passcode-form">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] text-faint mb-2">
                Team passcode
              </label>
              <input
                data-testid="passcode-input"
                autoFocus
                type="password"
                className="rl-input"
                placeholder="Enter the shared passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>
            <button
              data-testid="passcode-submit"
              disabled={busy || !passcode.trim()}
              type="submit"
              className="rl-btn rl-btn-primary w-full disabled:opacity-50"
            >
              {busy ? "Checking…" : "Open board"}
            </button>
            <div className="text-[11.5px] text-faint">
              Don&apos;t have the passcode? Ask your team owner.
            </div>
          </form>
        )}

        {stage === "pick" && (
          <form onSubmit={submitPick} className="rl-card p-7 space-y-5" data-testid="pick-form">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] text-faint mb-2">
                You are
              </label>
              <select
                data-testid="pick-member-select"
                className="rl-input"
                value={pickedId}
                onChange={(e) => setPickedId(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role || "team"}
                  </option>
                ))}
              </select>
            </div>
            <button data-testid="pick-submit" className="rl-btn rl-btn-primary w-full">
              Continue
            </button>
            <button
              type="button"
              data-testid="pick-back"
              onClick={() => {
                localStorage.removeItem(SESSION_KEY);
                setStage("passcode");
              }}
              className="rl-btn rl-btn-ghost w-full"
            >
              Use a different passcode
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
