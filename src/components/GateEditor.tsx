import type { GateDuration, GateOutputSettings, GateSource, MutantBrainPatch } from "../protocol/types";
import { summarizeGate } from "../app/summarize";
import { ChannelSelect } from "./ChannelSelect";

const SOURCE_OPTIONS: { value: GateSource["type"]; label: string }[] = [
  { value: "disabled", label: "Disabled" },
  { value: "note-gate", label: "Voice / note input event" },
  { value: "midi-note", label: "MIDI note" },
  { value: "clock", label: "MIDI clock" },
  { value: "transport-start", label: "Transport Start" },
  { value: "transport-stop", label: "Transport Stop" },
  { value: "transport-run", label: "Transport Run" },
  { value: "transport-start-stop", label: "Transport Restart (Start/Stop)" },
  { value: "cc-above", label: "CC above threshold" },
  { value: "cc-below", label: "CC below threshold" },
];

function withDefaults(type: GateSource["type"]): GateSource {
  switch (type) {
    case "disabled":
      return { type };
    case "note-gate":
      return { type, noteInput: 1 };
    case "midi-note":
      return { type, channel: { mode: "specific", channel: 10 }, note: 60 };
    case "clock":
      return { type, division: "1/16" };
    case "transport-start":
    case "transport-stop":
    case "transport-run":
    case "transport-start-stop":
      return { type };
    case "cc-above":
    case "cc-below":
      return { type, channel: { mode: "specific", channel: 1 }, cc: 1, threshold: 64 };
  }
}

function supportsDuration(type: GateSource["type"]): boolean {
  return type === "midi-note" || type === "clock" || type === "cc-above" || type === "cc-below";
}

export function GateEditor({
  index,
  patch,
  onChange,
  onClose,
}: {
  index: number;
  patch: MutantBrainPatch;
  onChange: (g: GateOutputSettings) => void;
  onClose: () => void;
}) {
  const gate = patch.gateOutputs[index];
  const s = gate.source;

  return (
    <div className="editor-drawer">
      <div className="editor-header">
        <h3>
          <span className="mono">Gate {String(index + 1).padStart(2, "0")}</span>
          <span className="explain">— {summarizeGate(gate)}</span>
        </h3>
        <button className="text-btn" onClick={onClose}>
          close
        </button>
      </div>

      <div className="editor-grid">
        <div className="field">
          <label>Source</label>
          <select
            value={s.type}
            onChange={(e) =>
              onChange({ source: withDefaults(e.target.value as GateSource["type"]), duration: gate.duration })
            }
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {s.type === "note-gate" && (
          <div className="field">
            <label>Note input</label>
            <select value={s.noteInput} onChange={(e) => onChange({ source: { ...s, noteInput: +e.target.value }, duration: gate.duration })}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  Voice {n}
                </option>
              ))}
            </select>
          </div>
        )}

        {s.type === "midi-note" && (
          <>
            <ChannelSelect value={s.channel} onChange={(channel) => onChange({ source: { ...s, channel }, duration: gate.duration })} />
            <div className="field">
              <label>Note</label>
              <input
                type="number"
                min={0}
                max={127}
                value={s.note}
                onChange={(e) => onChange({ source: { ...s, note: +e.target.value }, duration: gate.duration })}
              />
            </div>
          </>
        )}

        {s.type === "clock" && (
          <div className="field">
            <label>Division</label>
            <select value={s.division} onChange={(e) => onChange({ source: { ...s, division: e.target.value as typeof s.division }, duration: gate.duration })}>
              <option value="24ppqn">24 PPQN</option>
              <option value="1/32">1/32</option>
              <option value="1/16">1/16</option>
              <option value="1/8">1/8</option>
              <option value="1/4">1/4</option>
              <option value="1/2">1/2</option>
              <option value="1/1">1/1</option>
            </select>
          </div>
        )}

        {(s.type === "cc-above" || s.type === "cc-below") && (
          <>
            <ChannelSelect value={s.channel} onChange={(channel) => onChange({ source: { ...s, channel }, duration: gate.duration })} />
            <div className="field">
              <label>CC number</label>
              <input type="number" min={0} max={127} value={s.cc} onChange={(e) => onChange({ source: { ...s, cc: +e.target.value }, duration: gate.duration })} />
            </div>
            <div className="field">
              <label>Threshold</label>
              <input
                type="number"
                min={0}
                max={127}
                value={s.threshold}
                onChange={(e) => onChange({ source: { ...s, threshold: +e.target.value }, duration: gate.duration })}
              />
            </div>
          </>
        )}

        {supportsDuration(s.type) && (
          <>
            <div className="field">
              <label>Behavior</label>
              <select
                value={gate.duration.mode}
                onChange={(e) => {
                  const mode = e.target.value as GateDuration["mode"];
                  const duration: GateDuration =
                    mode === "trigger" || mode === "retrigger" ? { mode, durationMs: 10 } : { mode: mode as "gate" | "global" };
                  onChange({ source: s, duration });
                }}
              >
                <option value="gate">Gate</option>
                <option value="trigger">Trigger</option>
                <option value="retrigger">Retrigger</option>
                <option value="global">Global default</option>
              </select>
            </div>
            {(gate.duration.mode === "trigger" || gate.duration.mode === "retrigger") && (
              <div className="field">
                <label>Duration (ms)</label>
                <input
                  type="number"
                  min={1}
                  max={127}
                  value={gate.duration.durationMs}
                  onChange={(e) =>
                    onChange({
                      source: s,
                      duration: { mode: gate.duration.mode as "trigger" | "retrigger", durationMs: +e.target.value },
                    })
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
