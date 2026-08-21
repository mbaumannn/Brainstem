import type { CSSProperties, ReactNode } from "react";
import { toneDim } from "../app/colors";

export function ChannelRing({
  tone,
  active,
  selected,
  size = 22,
  children,
}: {
  tone: string;
  active: boolean;
  selected?: boolean;
  size?: number;
  children?: ReactNode;
}) {
  return (
    <span
      className={`channel-ring ${active ? "" : "is-muted"} ${selected ? "is-selected" : ""}`}
      style={
        {
          "--ring-color": tone,
          "--ring-dim-color": toneDim(tone),
          "--ring-size": `${size}px`,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}
