import React from "react";
import { initials, avatarColor } from "@/lib/relay";

export const Avatar = ({ member, size = 28 }) => {
  const id = member?.id || "?";
  const name = member?.name || "—";
  const bg = avatarColor(id);
  return (
    <div
      data-testid={`avatar-${id}`}
      title={name}
      style={{ width: size, height: size, background: bg }}
      className="rounded-full inline-flex items-center justify-center text-white shrink-0 font-medium"
    >
      <span style={{ fontSize: Math.round(size * 0.4) }}>{initials(name)}</span>
    </div>
  );
};
