import type { MidiChannelSel } from "../protocol/types";

export function ChannelSelect({
  value,
  onChange,
}: {
  value: MidiChannelSel;
  onChange: (v: MidiChannelSel) => void;
}) {
  return (
    <div className="field">
      <label>MIDI channel</label>
      <div className="row">
        <select
          value={value.mode}
          onChange={(e) => {
            const mode = e.target.value as MidiChannelSel["mode"];
            if (mode === "specific") onChange({ mode: "specific", channel: 1 });
            else onChange({ mode } as MidiChannelSel);
          }}
        >
          <option value="specific">Channel</option>
          <option value="omni">Omni</option>
          <option value="global">Global default</option>
        </select>
        {value.mode === "specific" && (
          <input
            type="number"
            min={1}
            max={16}
            value={value.channel}
            className="mono"
            onChange={(e) => onChange({ mode: "specific", channel: clamp(+e.target.value, 1, 16) })}
          />
        )}
      </div>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
