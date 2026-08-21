import type { CvOutputSettings, GateOutputSettings, MidiChannelSel } from "../protocol/types";

function chanLabel(chan: MidiChannelSel): string {
  if (chan.mode === "omni") return "any channel";
  if (chan.mode === "global") return "the global channel";
  return `channel ${chan.channel}`;
}

export function summarizeCv(cv: CvOutputSettings): string {
  const s = cv.source;
  switch (s.type) {
    case "disabled":
      return "Not in use.";
    case "pitch":
      return `Pitch from note input ${s.noteInput}${s.transposeSemitones ? `, transposed ${s.transposeSemitones > 0 ? "+" : ""}${s.transposeSemitones} st` : ""}.`;
    case "velocity":
      return `Velocity from note input ${s.noteInput}, 0-${s.maxVolts}V.`;
    case "cc":
      return `CC ${s.cc} on ${chanLabel(s.channel)}, 0-${s.maxVolts}V.`;
    case "pitch-bend":
      return `Pitch bend on ${chanLabel(s.channel)}, 0-${s.maxVolts}V.`;
    case "aftertouch":
      return `Channel aftertouch on ${chanLabel(s.channel)}, 0-${s.maxVolts}V.`;
    case "clock-bpm":
      return `MIDI clock tempo (BPM), 0-${s.maxVolts}V.`;
    case "fixed":
      return `Fixed at ${s.volts}V.`;
  }
}

export function summarizeGate(g: GateOutputSettings): string {
  const s = g.source;
  const durSuffix = (() => {
    if (g.duration.mode === "trigger") return ` (${g.duration.durationMs}ms trigger)`;
    if (g.duration.mode === "retrigger") return ` (${g.duration.durationMs}ms retrigger)`;
    return "";
  })();
  switch (s.type) {
    case "disabled":
      return "Not in use.";
    case "note-gate":
      return `High while note input ${s.noteInput} is held.`;
    case "midi-note": {
      const velSuffix = s.minVelocity ? `, velocity >= ${s.minVelocity}` : "";
      const noteLabel = s.noteMax ? `notes ${s.note}-${s.noteMax}` : `note ${s.note}`;
      return `${noteLabel} on ${chanLabel(s.channel)}${velSuffix}${durSuffix}.`;
    }
    case "clock":
      return `Pulse on every ${s.division === "24ppqn" ? "24 PPQN clock tick" : s.division + " clock division"}${durSuffix}.`;
    case "transport-start":
      return "Pulses on MIDI Start.";
    case "transport-stop":
      return "Pulses on MIDI Stop.";
    case "transport-run":
      return "High while transport is running.";
    case "transport-start-stop":
      return "Pulses on MIDI Start and Stop.";
    case "cc-above":
      return `High while CC ${s.cc} on ${chanLabel(s.channel)} is above ${s.threshold}${durSuffix}.`;
    case "cc-below":
      return `High while CC ${s.cc} on ${chanLabel(s.channel)} is below ${s.threshold}${durSuffix}.`;
  }
}

function durationLabel(mode: GateOutputSettings["duration"]["mode"]): string {
  if (mode === "retrigger") return "Retrigger";
  if (mode === "global") return "Global";
  return mode.charAt(0).toUpperCase() + mode.slice(1); // "Gate" | "Trigger"
}

export function shortGateLabel(g: GateOutputSettings): string {
  const s = g.source;
  switch (s.type) {
    case "disabled":
      return "Disabled";
    case "note-gate":
      return "Voice gate";
    case "midi-note":
    case "clock":
    case "cc-above":
    case "cc-below":
      // These sources support a configurable duration (gate/trigger/retrigger/global),
      // so the cell label should match the selected behavior rather than hardcoding
      // a source-type name such as "Trigger" or "CC gate".
      return durationLabel(g.duration.mode);
    case "transport-start":
    case "transport-stop":
    case "transport-run":
    case "transport-start-stop":
      return "Transport";
  }
}

export function shortGateDetail(g: GateOutputSettings): string {
  const s = g.source;
  switch (s.type) {
    case "disabled":
      return "";
    case "note-gate":
      return `Voice ${s.noteInput}`;
    case "midi-note":
      return `${chanLabel(s.channel)} · ${s.noteMax ? `${s.note}-${s.noteMax}` : `note ${s.note}`}`;
    case "clock":
      return s.division;
    case "transport-start":
      return "Start";
    case "transport-stop":
      return "Stop";
    case "transport-run":
      return "Run";
    case "transport-start-stop":
      return "Start/Stop";
    case "cc-above":
      return `CC${s.cc} > ${s.threshold}`;
    case "cc-below":
      return `CC${s.cc} < ${s.threshold}`;
  }
}
