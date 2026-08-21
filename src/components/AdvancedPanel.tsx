import type { MutantBrainPatch, NoteInputSettings, NotePriority } from "../protocol/types";
import { ChannelSelect } from "./ChannelSelect";
import { channelColor } from "../app/colors";

const LETTERS = ["A", "B", "C", "D"];

const PRIORITY_OPTIONS: { value: NotePriority; label: string }[] = [
  { value: "last", label: "Last note" },
  { value: "lowest", label: "Lowest note" },
  { value: "highest", label: "Highest note" },
  { value: "cycle-2", label: "Cycle 2" },
  { value: "cycle-3", label: "Cycle 3" },
  { value: "cycle-4", label: "Cycle 4" },
  { value: "chord-2", label: "Chord 2" },
  { value: "chord-3", label: "Chord 3" },
  { value: "chord-4", label: "Chord 4" },
  { value: "paraphonic", label: "Paraphonic" },
  { value: "paraphonic-release", label: "Paraphonic (release voicing)" },
];

export function AdvancedPanel({
  patch,
  onChange,
}: {
  patch: MutantBrainPatch;
  onChange: (patch: MutantBrainPatch) => void;
}) {
  function updateNoteInput(i: number, ni: NoteInputSettings) {
    const noteInputs = [...patch.noteInputs] as MutantBrainPatch["noteInputs"];
    noteInputs[i] = ni;
    onChange({ ...patch, noteInputs });
  }

  return (
    <div className="advanced-panel">
      <div className="advanced-section">
        <h4>Globals</h4>
        <div className="editor-grid">
          <div className="field">
            <label>Default MIDI channel</label>
            <input
              type="number"
              min={1}
              max={16}
              value={patch.globals.midiChannel}
              onChange={(e) => onChange({ ...patch, globals: { ...patch.globals, midiChannel: +e.target.value } })}
            />
          </div>
          <div className="field">
            <label>Default trigger duration (ms)</label>
            <input
              type="number"
              min={1}
              max={127}
              value={patch.globals.defaultTriggerDurationMs}
              onChange={(e) =>
                onChange({ ...patch, globals: { ...patch.globals, defaultTriggerDurationMs: +e.target.value } })
              }
            />
          </div>
        </div>
      </div>

      <div className="advanced-section">
        <h4>Note Inputs 1–4</h4>
        {patch.noteInputs.map((ni, i) => (
          <div key={i} className="note-input-card">
            <div className="ni-head">
              <span className="mono ni-letter" style={{ color: channelColor(i) }}>
                Note input {i + 1} ({LETTERS[i]})
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <input type="checkbox" checked={ni.enabled} onChange={(e) => updateNoteInput(i, { ...ni, enabled: e.target.checked })} />
                enabled
              </label>
            </div>
            {ni.enabled && (
              <div className="editor-grid">
                <ChannelSelect value={ni.channel} onChange={(channel) => updateNoteInput(i, { ...ni, channel })} />
                <div className="field">
                  <label>Priority / mode</label>
                  <select value={ni.priority} onChange={(e) => updateNoteInput(i, { ...ni, priority: e.target.value as NotePriority })}>
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Min note</label>
                  <input type="number" min={0} max={127} value={ni.noteMin} onChange={(e) => updateNoteInput(i, { ...ni, noteMin: +e.target.value })} />
                </div>
                <div className="field">
                  <label>Max note</label>
                  <input type="number" min={0} max={127} value={ni.noteMax} onChange={(e) => updateNoteInput(i, { ...ni, noteMax: +e.target.value })} />
                </div>
                <div className="field">
                  <label>Min velocity</label>
                  <input
                    type="number"
                    min={0}
                    max={127}
                    value={ni.minVelocity}
                    onChange={(e) => updateNoteInput(i, { ...ni, minVelocity: +e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Pitch bend range (st)</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={ni.pitchBendRangeSemitones}
                    onChange={(e) => updateNoteInput(i, { ...ni, pitchBendRangeSemitones: +e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
