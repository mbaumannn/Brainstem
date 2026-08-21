import {
  CHAN_SPECIAL,
  CLOCK_DIVISION_TICKS,
  CV_OBJECTS,
  DUR_MODE,
  GATE_OBJECTS,
  NOTE_INPUT_OBJECTS,
  OBJECT,
  PARAM,
  PITCH_SCHEME,
  PRIORITY,
  RECORD_LENGTH,
  SRC_HI,
  SRC_LO_STACK,
  SYSEX_END,
  SYSEX_HEADER,
  SYSEX_START,
  TRANSPOSE_NONE,
} from "./constants";
import type {
  ClockDivision,
  CvOutputSettings,
  GateOutputSettings,
  MidiChannelSel,
  MutantBrainPatch,
  NoteInputSettings,
  NotePriority,
  PitchScheme,
} from "./types";

type Record4 = [number, number, number, number];

function value14(n: number): [number, number] {
  const v = Math.max(0, Math.min(0x3fff, Math.round(n)));
  return [(v >> 7) & 0x7f, v & 0x7f];
}

function channelRecord(obj: number, param: number, chan: MidiChannelSel): Record4 {
  if (chan.mode === "omni") return [obj, param, CHAN_SPECIAL.OMNI, 0];
  if (chan.mode === "global") return [obj, param, CHAN_SPECIAL.GLOBAL, 0];
  return [obj, param, CHAN_SPECIAL.SPECIFIC, Math.max(0, Math.min(15, chan.channel - 1))];
}

const PRIORITY_TO_WIRE: Record<NotePriority, number> = {
  last: PRIORITY.LAST,
  lowest: PRIORITY.LOW,
  highest: PRIORITY.HIGH,
  "cycle-2": PRIORITY.CYCLE_2,
  "cycle-3": PRIORITY.CYCLE_3,
  "cycle-4": PRIORITY.CYCLE_4,
  "chord-2": PRIORITY.CHORD_2,
  "chord-3": PRIORITY.CHORD_3,
  "chord-4": PRIORITY.CHORD_4,
  paraphonic: PRIORITY.PARAPHONIC,
  "paraphonic-release": PRIORITY.PARAPHONIC_RELEASE,
};

const PITCH_SCHEME_TO_WIRE: Record<PitchScheme, number> = {
  "v-oct": PITCH_SCHEME.V_OCT,
  "hz-v": PITCH_SCHEME.HZ_V,
  "12v-oct": PITCH_SCHEME.V12_OCT,
};

const STACK_SRC_HI = [SRC_HI.STACK_1, SRC_HI.STACK_2, SRC_HI.STACK_3, SRC_HI.STACK_4];

function encodeGlobals(patch: MutantBrainPatch, out: Record4[]) {
  const g = patch.globals;
  out.push([OBJECT.GLOBAL, PARAM.CHAN, CHAN_SPECIAL.SPECIFIC, Math.max(0, Math.min(15, g.midiChannel - 1))]);
  out.push([OBJECT.GLOBAL, PARAM.GATE_DUR, ...value14(g.defaultTriggerDurationMs)] as Record4);
}

function encodeNoteInput(obj: number, ni: NoteInputSettings, out: Record4[]) {
  // SRC high byte doubles as the enable flag for a note input (1 = active).
  out.push([obj, PARAM.SRC, ni.enabled ? 1 : 0, 0]);
  out.push(channelRecord(obj, PARAM.CHAN, ni.channel));
  out.push([obj, PARAM.NOTE_MIN, ...value14(ni.noteMin)] as Record4);
  out.push([obj, PARAM.NOTE_MAX, ...value14(ni.noteMax)] as Record4);
  out.push([obj, PARAM.VEL_MIN, ...value14(ni.minVelocity)] as Record4);
  out.push([obj, PARAM.PB_RANGE, ...value14(ni.pitchBendRangeSemitones)] as Record4);
  out.push([obj, PARAM.PRIORITY, PRIORITY_TO_WIRE[ni.priority], 0]);
}

function encodeCvOutput(obj: number, cv: CvOutputSettings, out: Record4[]) {
  const s = cv.source;
  switch (s.type) {
    case "disabled":
      out.push([obj, PARAM.SRC, SRC_HI.DISABLE, 0]);
      break;
    case "pitch":
      out.push([obj, PARAM.SRC, STACK_SRC_HI[s.noteInput - 1], SRC_LO_STACK.ANY_NOTES]);
      out.push([obj, PARAM.TRANSPOSE, ...value14(s.transposeSemitones + TRANSPOSE_NONE)] as Record4);
      out.push([obj, PARAM.PITCH_SCHEME, PITCH_SCHEME_TO_WIRE[s.pitchScheme], 0]);
      out.push([obj, PARAM.VOLTS, ...value14(s.maxVolts)] as Record4);
      break;
    case "velocity":
      out.push([obj, PARAM.SRC, STACK_SRC_HI[s.noteInput - 1], SRC_LO_STACK.VELOCITY]);
      out.push([obj, PARAM.VOLTS, ...value14(s.maxVolts)] as Record4);
      break;
    case "cc":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_CC, s.cc]);
      out.push(channelRecord(obj, PARAM.CHAN, s.channel));
      out.push([obj, PARAM.VOLTS, ...value14(s.maxVolts)] as Record4);
      break;
    case "pitch-bend":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_BEND, 0]);
      out.push(channelRecord(obj, PARAM.CHAN, s.channel));
      out.push([obj, PARAM.VOLTS, ...value14(s.maxVolts)] as Record4);
      break;
    case "aftertouch":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_TOUCH, 0]);
      out.push(channelRecord(obj, PARAM.CHAN, s.channel));
      out.push([obj, PARAM.VOLTS, ...value14(s.maxVolts)] as Record4);
      break;
    case "clock-bpm":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_TICK, 0]);
      out.push([obj, PARAM.VOLTS, ...value14(s.maxVolts)] as Record4);
      break;
    case "fixed":
      out.push([obj, PARAM.SRC, SRC_HI.TEST_VOLTAGE, 0]);
      out.push([obj, PARAM.VOLTS, ...value14(s.volts)] as Record4);
      break;
  }
}

function divisionTicks(division: ClockDivision): number {
  return CLOCK_DIVISION_TICKS[division] ?? CLOCK_DIVISION_TICKS["1/16"];
}

function encodeGateDuration(obj: number, dur: GateOutputSettings["duration"], out: Record4[]) {
  switch (dur.mode) {
    case "gate":
      out.push([obj, PARAM.GATE_DUR, DUR_MODE.INFINITE, 0]);
      break;
    case "global":
      out.push([obj, PARAM.GATE_DUR, DUR_MODE.GLOBAL, 0]);
      break;
    case "trigger":
      out.push([obj, PARAM.GATE_DUR, DUR_MODE.MILLISECONDS, dur.durationMs & 0x7f]);
      break;
    case "retrigger":
      out.push([obj, PARAM.GATE_DUR, DUR_MODE.RETRIGGER, dur.durationMs & 0x7f]);
      break;
  }
}

function encodeGateOutput(obj: number, gate: GateOutputSettings, out: Record4[]) {
  const s = gate.source;
  switch (s.type) {
    case "disabled":
      out.push([obj, PARAM.SRC, SRC_HI.DISABLE, 0]);
      return;
    case "note-gate":
      out.push([obj, PARAM.SRC, STACK_SRC_HI[s.noteInput - 1], SRC_LO_STACK.ANY_NOTES]);
      break;
    case "midi-note":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_NOTE, s.note]);
      out.push(channelRecord(obj, PARAM.CHAN, s.channel));
      break;
    case "clock":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_TICK_RUN, 0]);
      out.push([obj, PARAM.TICK_OFS, ...value14(divisionTicks(s.division))] as Record4);
      break;
    case "transport-start":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_START, 0]);
      break;
    case "transport-stop":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_STOP, 0]);
      break;
    case "transport-run":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_RUN, 0]);
      break;
    case "transport-start-stop":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_START_STOP, 0]);
      break;
    case "cc-above":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_CC, s.cc]);
      out.push(channelRecord(obj, PARAM.CHAN, s.channel));
      out.push([obj, PARAM.THRESHOLD, ...value14(s.threshold)] as Record4);
      break;
    case "cc-below":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_CC_NEG, s.cc]);
      out.push(channelRecord(obj, PARAM.CHAN, s.channel));
      out.push([obj, PARAM.THRESHOLD, ...value14(s.threshold)] as Record4);
      break;
  }
  encodeGateDuration(obj, gate.duration, out);
}

/** Encode a typed patch into Mutant Brain SysEx bytes. */
export function encodeSysex(patch: MutantBrainPatch): Uint8Array {
  const records: Record4[] = [];

  encodeGlobals(patch, records);
  patch.noteInputs.forEach((ni, i) => encodeNoteInput(NOTE_INPUT_OBJECTS[i], ni, records));
  patch.cvOutputs.forEach((cv, i) => encodeCvOutput(CV_OBJECTS[i], cv, records));
  patch.gateOutputs.forEach((g, i) => encodeGateOutput(GATE_OBJECTS[i], g, records));

  if (patch.unknownRecords) {
    for (const r of patch.unknownRecords) records.push(r);
  }

  const bytes: number[] = [SYSEX_START, ...SYSEX_HEADER];
  for (const r of records) bytes.push(...r);
  bytes.push(SYSEX_END);

  return new Uint8Array(bytes);
}

export { RECORD_LENGTH };
