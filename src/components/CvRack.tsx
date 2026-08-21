import type { CSSProperties } from "react";
import type { MutantBrainPatch } from "../protocol/types";
import { summarizeCv } from "../app/summarize";
import { channelColor } from "../app/colors";

const LETTERS = ["A", "B", "C", "D"];

export function CvRack({
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
      <h2 className="rack-title">CV Outputs</h2>
      <div className="cv-grid">
        {patch.cvOutputs.map((cv, i) => {
          const active = cv.source.type !== "disabled";
          return (
            <button
              key={i}
              style={{ "--card-color": channelColor(i), "--dot-opacity": active ? 1 : 0.25 } as CSSProperties}
              className={`cv-card ${selected === i ? "is-selected" : ""} ${active ? "is-active" : "is-idle"}`}
              onClick={() => onSelect(selected === i ? null : i)}
            >
              <span className="cv-letter mono">{LETTERS[i]}</span>
              <span className="cv-summary">{summarizeCv(cv)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
