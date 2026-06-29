import React, { useState } from "react";
import { api, setOwnerPin } from "@/lib/api";
import { toast } from "sonner";

export default function OwnerPinPrompt({ open, onClose, onUnlock }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      const ok = await api.checkOwnerPin(pin);
      if (!ok) {
        toast.error("Wrong PIN");
        setBusy(false);
        return;
      }
      setOwnerPin(pin);
      onUnlock();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="pin-overlay"
      className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="rl-card w-full max-w-sm p-6 fade-up"
        data-testid="pin-modal"
      >
        <div className="font-serif text-[19px] font-semibold mb-2">Unlock owner mode</div>
        <div className="text-[12.5px] text-muted mb-4">
          Enter the owner PIN to manage members, passcodes and delete tasks.
        </div>
        <input
          data-testid="pin-input"
          autoFocus
          type="password"
          className="rl-input"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="rl-btn rl-btn-ghost" onClick={onClose} data-testid="pin-cancel">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !pin.trim()}
            className="rl-btn rl-btn-primary disabled:opacity-50"
            data-testid="pin-unlock"
          >
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
