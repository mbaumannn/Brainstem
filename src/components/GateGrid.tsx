import type { CSSProperties } from "react";
import type { MutantBrainPatch } from "../protocol/types";
import { shortGateDetail, shortGateLabel } from "../app/summarize";
import { channelColor } from "../app/colors";

export function GateGrid({
  patch,
  selected,
  onSelect,
}: {
  patch: MutantBrainPatch;
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  return (
    <section className="rack">
      <h2 className="rack-title">Gate Outputs</h2>
      <div className="gate-grid">
        {patch.gateOutputs.map((g, i) => {
          const active = g.source.type !== "disabled";
          const color = g.source.type === "note-gate" ? channelColor(g.source.noteInput - 1) : "var(--ch-neutral)";
          return (
            <button
              key={i}
              style={{ "--card-color": color } as CSSProperties}
              className={`gate-cell ${selected === i ? "is-selected" : ""} ${active ? "is-active" : "is-idle"}`}
              onClick={() => onSelect(selected === i ? null : i)}
            >
              <span className="gate-num mono">{String(i + 1).padStart(2, "0")}</span>
              <span className="gate-kind">{shortGateLabel(g)}</span>
              {active && <span className="gate-detail">{shortGateDetail(g)}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
