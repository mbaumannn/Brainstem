import type { CvOutputSettings, CvSource, MutantBrainPatch } from "../protocol/types";
import { summarizeCv } from "../app/summarize";
import { channelColor } from "../app/colors";
import { ChannelSelect } from "./ChannelSelect";

const LETTERS = ["A", "B", "C", "D"];

const SOURCE_OPTIONS: { value: CvSource["type"]; label: string }[] = [
  { value: "disabled", label: "Disabled" },
  { value: "pitch", label: "Note pitch" },
  { value: "velocity", label: "Note velocity" },
  { value: "cc", label: "MIDI CC" },
  { value: "pitch-bend", label: "Pitch bend" },
  { value: "aftertouch", label: "Channel aftertouch" },
  { value: "clock-bpm", label: "MIDI clock BPM" },
  { value: "fixed", label: "Fixed voltage" },
];

function withDefaults(type: CvSource["type"]): CvSource {
  switch (type) {
    case "disabled":
      return { type };
    case "pitch":
      return { type, noteInput: 1, transposeSemitones: 0, pitchScheme: "v-oct", maxVolts: 5 };
    case "velocity":
      return { type, noteInput: 1, maxVolts: 5 };
    case "cc":
      return { type, channel: { mode: "specific", channel: 1 }, cc: 1, maxVolts: 5 };
    case "pitch-bend":
      return { type, channel: { mode: "specific", channel: 1 }, maxVolts: 5 };
    case "aftertouch":
      return { type, channel: { mode: "specific", channel: 1 }, maxVolts: 5 };
    case "clock-bpm":
      return { type, maxVolts: 5 };
    case "fixed":
      return { type, volts: 0 };
  }
}

export function CvEditor({
  index,
  patch,
  onChange,
  onClose,
}: {
  index: number;
  patch: MutantBrainPatch;
  onChange: (cv: CvOutputSettings) => void;
  onClose: () => void;
}) {
  const cv = patch.cvOutputs[index];
  const s = cv.source;
  const color = channelColor(index);

  return (
    <div className="editor-drawer" style={{ borderColor: color }}>
      <div className="editor-header">
        <h3>
          <span className="mono" style={{ color }}>
            CV {LETTERS[index]}
          </span>
          <span className="explain">— {summarizeCv(cv)}</span>
        </h3>
        <button className="text-btn" onClick={onClose}>
          close
        </button>
      </div>

      <div className="editor-grid">
        <div className="field">
          <label>Source</label>
          <select value={s.type} onChange={(e) => onChange({ source: withDefaults(e.target.value as CvSource["type"]) })}>
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {s.type === "pitch" && (
          <>
            <div className="field">
              <label>Note input</label>
              <select
                value={s.noteInput}
                onChange={(e) => onChange({ source: { ...s, noteInput: +e.target.value } })}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    Voice {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Transpose (st)</label>
              <input
                type="number"
                value={s.transposeSemitones}
                onChange={(e) => onChange({ source: { ...s, transposeSemitones: +e.target.value } })}
              />
            </div>
            <div className="field">
              <label>Voltage standard</label>
              <select
                value={s.pitchScheme}
                onChange={(e) => onChange({ source: { ...s, pitchScheme: e.target.value as typeof s.pitchScheme } })}
              >
                <option value="v-oct">V/Oct</option>
                <option value="hz-v">Hz/V</option>
                <option value="12v-oct">12V/Oct</option>
              </select>
            </div>
            <div className="field">
              <label>Max volts</label>
              <input type="number" value={s.maxVolts} onChange={(e) => onChange({ source: { ...s, maxVolts: +e.target.value } })} />
            </div>
          </>
        )}

        {s.type === "velocity" && (
          <>
            <div className="field">
              <label>Note input</label>
              <select value={s.noteInput} onChange={(e) => onChange({ source: { ...s, noteInput: +e.target.value } })}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    Voice {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Max volts</label>
              <input type="number" value={s.maxVolts} onChange={(e) => onChange({ source: { ...s, maxVolts: +e.target.value } })} />
            </div>
          </>
        )}

        {s.type === "cc" && (
          <>
            <ChannelSelect value={s.channel} onChange={(channel) => onChange({ source: { ...s, channel } })} />
            <div className="field">
              <label>CC number</label>
              <input type="number" min={0} max={127} value={s.cc} onChange={(e) => onChange({ source: { ...s, cc: +e.target.value } })} />
            </div>
            <div className="field">
              <label>Max volts</label>
              <input type="number" value={s.maxVolts} onChange={(e) => onChange({ source: { ...s, maxVolts: +e.target.value } })} />
            </div>
          </>
        )}

        {(s.type === "pitch-bend" || s.type === "aftertouch") && (
          <>
            <ChannelSelect value={s.channel} onChange={(channel) => onChange({ source: { ...s, channel } })} />
            <div className="field">
              <label>Max volts</label>
              <input type="number" value={s.maxVolts} onChange={(e) => onChange({ source: { ...s, maxVolts: +e.target.value } })} />
            </div>
          </>
        )}

        {s.type === "clock-bpm" && (
          <div className="field">
            <label>Max volts</label>
            <input type="number" value={s.maxVolts} onChange={(e) => onChange({ source: { ...s, maxVolts: +e.target.value } })} />
          </div>
        )}

        {s.type === "fixed" && (
          <div className="field">
            <label>Volts</label>
            <input type="number" value={s.volts} onChange={(e) => onChange({ source: { ...s, volts: +e.target.value } })} />
          </div>
        )}
      </div>
    </div>
  );
}
