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

// Wire value_lo for a specific channel is the 1-based MIDI channel number
// (1-16) directly -- the firmware itself subtracts 1 when storing it
// in-RAM (`pcfg->chan = value_lo - 1`). See firmware/cv.c cv_nrpn() /
// firmware/gate.c gate_nrpn() NRPNL_CHAN handling, confirmed against
// cvocd_default.syx record `01 02 00 01` (global channel = 1).
function channelRecord(obj: number, param: number, chan: MidiChannelSel): Record4 {
  if (chan.mode === "omni") return [obj, param, CHAN_SPECIAL.OMNI, 0];
  if (chan.mode === "global") return [obj, param, CHAN_SPECIAL.GLOBAL, 0];
  return [obj, param, CHAN_SPECIAL.SPECIFIC, Math.max(1, Math.min(16, chan.channel))];
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
  out.push([OBJECT.GLOBAL, PARAM.CHAN, CHAN_SPECIAL.SPECIFIC, Math.max(1, Math.min(16, g.midiChannel))]);
  // global_nrpn() only applies NRPNL_GATE_DUR when value_hi === NRPVH_DUR_MS;
  // any other value_hi is silently ignored. value_lo is the plain ms value
  // (0-127), not a 14-bit split.
  out.push([OBJECT.GLOBAL, PARAM.GATE_DUR, DUR_MODE.MILLISECONDS, Math.max(0, Math.min(127, Math.round(g.defaultTriggerDurationMs)))]);
}

function encodeNoteInput(obj: number, ni: NoteInputSettings, out: Record4[]) {
  // SRC high byte doubles as the enable flag for a note input (1 = active).
  out.push([obj, PARAM.SRC, ni.enabled ? 1 : 0, 0]);
  out.push(channelRecord(obj, PARAM.CHAN, ni.channel));
  out.push([obj, PARAM.NOTE_MIN, ...value14(ni.noteMin)] as Record4);
  out.push([obj, PARAM.NOTE_MAX, ...value14(ni.noteMax)] as Record4);
  out.push([obj, PARAM.VEL_MIN, ...value14(ni.minVelocity)] as Record4);
  out.push([obj, PARAM.PB_RANGE, ...value14(ni.pitchBendRangeSemitones)] as Record4);
  // stack_nrpn() reads NRPNL_PRIORITY from value_lo, not value_hi.
  out.push([obj, PARAM.PRIORITY, 0, PRIORITY_TO_WIRE[ni.priority]]);
}

function encodeCvOutput(obj: number, cv: CvOutputSettings, out: Record4[]) {
  const s = cv.source;
  switch (s.type) {
    case "disabled":
      out.push([obj, PARAM.SRC, SRC_HI.DISABLE, 0]);
      break;
    case "pitch":
      // cv_nrpn()'s SRC handler only recognises value_lo === NOTE1..NOTE4
      // (NRPVL_SRC_NOTE1..4) for pitch mode -- ANY_NOTES(5) matches no
      // case in that inner switch, so the record is silently dropped and
      // the CV output is left unconfigured on real hardware. This app
      // models one output slot per note input (mono voice), so that's
      // always NOTE1. Confirmed against the real Mutant Brain fixture
      // `mutant_brain_live.syx`, where every pitch CV uses value_lo=1.
      out.push([obj, PARAM.SRC, STACK_SRC_HI[s.noteInput - 1], SRC_LO_STACK.NOTE_1]);
      out.push([obj, PARAM.TRANSPOSE, ...value14(s.transposeSemitones + TRANSPOSE_NONE)] as Record4);
      // cv_nrpn() reads NRPNL_PITCH_SCHEME from value_lo, not value_hi.
      out.push([obj, PARAM.PITCH_SCHEME, 0, PITCH_SCHEME_TO_WIRE[s.pitchScheme]]);
      // Note: cv_write_note() always uses a hardcoded dacs_per_oct (500),
      // ignoring event.volts, for CV_NOTE mode -- pitch CVs have no real
      // "max volts" concept on real firmware, and the reference
      // configurator doesn't emit a VOLTS record for pitch outputs
      // either. Omitted here to match; kept purely as a UI-facing default.
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
      // gate_nrpn()'s SRC handler maps value_lo === NOTE1..NOTE4 to
      // GATE_NOTE_GATEA..D ("output slot N is currently sounding"), which
      // is what "gate follows note-input N held state" means here.
      // ANY_NOTES(5) is a *different* mode (GATE_NOTE_ON, "some note is
      // held on this stack") -- not a no-op like the CV case, but the
      // wrong behavior. This app models one output slot per note input,
      // so that's always NOTE1. Confirmed against the real Mutant Brain
      // fixture, where every voice gate uses value_lo=1.
      out.push([obj, PARAM.SRC, STACK_SRC_HI[s.noteInput - 1], SRC_LO_STACK.NOTE_1]);
      break;
    case "midi-note":
      out.push([obj, PARAM.SRC, SRC_HI.MIDI_NOTE, s.note]);
      out.push(channelRecord(obj, PARAM.CHAN, s.channel));
      // gate_nrpn(): NOTE_MAX (range top) and VEL_MIN (velocity gate)
      // are separate fields on T_GATE_MIDI_NOTE, both real and commonly
      // used on real hardware (e.g. an "any note, any velocity" catch-all
      // trigger with note=0/noteMax=127/minVelocity=0 or 1).
      if (s.noteMax) out.push([obj, PARAM.NOTE_MAX, 0, s.noteMax & 0x7f]);
      if (s.minVelocity) out.push([obj, PARAM.VEL_MIN, 0, s.minVelocity & 0x7f]);
      break;
    case "clock": {
      // gate_nrpn(): clock division lives in the SRC record's own value_lo
      // (falls back to DEFAULT_GATE_DIV=6 on-device if 0). TICK_OFS (param
      // 0x0b) is a separate "initial tick count" field, not the division.
      const srcHi = s.onlyWhileRunning === false ? SRC_HI.MIDI_TICK : SRC_HI.MIDI_TICK_RUN;
      out.push([obj, PARAM.SRC, srcHi, divisionTicks(s.division) & 0x7f]);
      break;
    }
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
