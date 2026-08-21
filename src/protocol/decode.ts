import {
  CHAN_SPECIAL,
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
  CvSource,
  GateOutputSettings,
  GateSource,
  MidiChannelSel,
  MutantBrainPatch,
  NoteInputSettings,
  NotePriority,
  PitchScheme,
} from "./types";
import { defaultPatch } from "../profiles/defaults";
import { ProtocolError } from "./validation";

type Record4 = [number, number, number, number];

function parseValue14(hi: number, lo: number): number {
  return ((hi & 0x7f) << 7) | (lo & 0x7f);
}

// value_lo for a specific channel is the 1-based MIDI channel (1-16)
// directly -- see the matching note in encode.ts's channelRecord().
function parseChannel(hi: number, lo: number): MidiChannelSel {
  if (hi === CHAN_SPECIAL.OMNI) return { mode: "omni" };
  if (hi === CHAN_SPECIAL.GLOBAL) return { mode: "global" };
  return { mode: "specific", channel: lo || 1 };
}

const WIRE_TO_PRIORITY: Record<number, NotePriority> = {
  [PRIORITY.LAST]: "last",
  [PRIORITY.LOW]: "lowest",
  [PRIORITY.HIGH]: "highest",
  [PRIORITY.CYCLE_2]: "cycle-2",
  [PRIORITY.CYCLE_3]: "cycle-3",
  [PRIORITY.CYCLE_4]: "cycle-4",
  [PRIORITY.CHORD_2]: "chord-2",
  [PRIORITY.CHORD_3]: "chord-3",
  [PRIORITY.CHORD_4]: "chord-4",
  [PRIORITY.PARAPHONIC]: "paraphonic",
  [PRIORITY.PARAPHONIC_RELEASE]: "paraphonic-release",
};

const WIRE_TO_PITCH_SCHEME: Record<number, PitchScheme> = {
  [PITCH_SCHEME.V_OCT]: "v-oct",
  [PITCH_SCHEME.HZ_V]: "hz-v",
  [PITCH_SCHEME.V12_OCT]: "12v-oct",
};

// cv_nrpn()/gate_nrpn() only recognise value_lo === NOTE1..NOTE4 as "the
// stack's (single, mono) note output" -- ANY_NOTES/NO_NOTES/VELOCITY are
// distinct, unmodeled firmware modes and must not be folded into
// "pitch"/"note-gate" on decode (see the matching note in encode.ts).
const STACK_NOTE_SLOT_LO = new Set<number>([
  SRC_LO_STACK.NOTE_1,
  SRC_LO_STACK.NOTE_2,
  SRC_LO_STACK.NOTE_3,
  SRC_LO_STACK.NOTE_4,
]);

const STACK_SRC_HI_TO_INDEX: Record<number, number> = {
  [SRC_HI.STACK_1]: 1,
  [SRC_HI.STACK_2]: 2,
  [SRC_HI.STACK_3]: 3,
  [SRC_HI.STACK_4]: 4,
};

const TICKS_TO_DIVISION: Record<number, ClockDivision> = {
  1: "24ppqn",
  3: "1/32",
  6: "1/16",
  12: "1/8",
  24: "1/4",
  48: "1/2",
  96: "1/1",
};

function splitRecords(body: Uint8Array): Record4[] {
  if (body.length % RECORD_LENGTH !== 0) {
    throw new ProtocolError(
      "This file is not a Mutant Brain SysEx configuration (unexpected message length).",
    );
  }
  const records: Record4[] = [];
  for (let i = 0; i < body.length; i += RECORD_LENGTH) {
    records.push([body[i], body[i + 1], body[i + 2], body[i + 3]]);
  }
  return records;
}

interface ObjectRecords {
  object: number;
  params: Map<number, [number, number]>;
}

function groupByObject(
  records: Record4[],
  knownObjects: Set<number>,
  unknown: Array<Record4>,
): Map<number, ObjectRecords> {
  const map = new Map<number, ObjectRecords>();
  for (const [obj, param, hi, lo] of records) {
    if (!knownObjects.has(obj)) {
      unknown.push([obj, param, hi, lo]);
      continue;
    }
    let entry = map.get(obj);
    if (!entry) {
      entry = { object: obj, params: new Map() };
      map.set(obj, entry);
    }
    entry.params.set(param, [hi, lo]);
  }
  return map;
}

function decodeGlobals(entry: ObjectRecords | undefined, unknown: Record4[]) {
  const base = defaultPatch().globals;
  if (!entry) return base;
  const chan = entry.params.get(PARAM.CHAN);
  const dur = entry.params.get(PARAM.GATE_DUR);
  entry.params.forEach((v, param) => {
    if (param !== PARAM.CHAN && param !== PARAM.GATE_DUR) {
      unknown.push([entry.object, param, v[0], v[1]]);
    }
  });
  return {
    midiChannel: chan ? chan[1] || 1 : base.midiChannel,
    // global_nrpn() only stores NRPNL_GATE_DUR when value_hi === DUR_MS;
    // value_lo is the plain ms value, not a 14-bit split.
    defaultTriggerDurationMs: dur && dur[0] === DUR_MODE.MILLISECONDS ? dur[1] : base.defaultTriggerDurationMs,
  };
}

function decodeNoteInput(entry: ObjectRecords | undefined, unknown: Record4[]): NoteInputSettings {
  const base = defaultPatch().noteInputs[0];
  if (!entry) return base;
  const known = new Set<number>([
    PARAM.SRC,
    PARAM.CHAN,
    PARAM.NOTE_MIN,
    PARAM.NOTE_MAX,
    PARAM.VEL_MIN,
    PARAM.PB_RANGE,
    PARAM.PRIORITY,
  ]);
  entry.params.forEach((v, param) => {
    if (!known.has(param)) unknown.push([entry.object, param, v[0], v[1]]);
  });
  const src = entry.params.get(PARAM.SRC);
  const chan = entry.params.get(PARAM.CHAN);
  const noteMin = entry.params.get(PARAM.NOTE_MIN);
  const noteMax = entry.params.get(PARAM.NOTE_MAX);
  const velMin = entry.params.get(PARAM.VEL_MIN);
  const pbRange = entry.params.get(PARAM.PB_RANGE);
  const priority = entry.params.get(PARAM.PRIORITY);
  return {
    enabled: src ? src[0] === 1 : base.enabled,
    channel: chan ? parseChannel(chan[0], chan[1]) : base.channel,
    // stack_nrpn() reads NRPNL_PRIORITY from value_lo, not value_hi.
    priority: priority ? WIRE_TO_PRIORITY[priority[1]] ?? base.priority : base.priority,
    noteMin: noteMin ? parseValue14(noteMin[0], noteMin[1]) : base.noteMin,
    noteMax: noteMax ? parseValue14(noteMax[0], noteMax[1]) : base.noteMax,
    minVelocity: velMin ? parseValue14(velMin[0], velMin[1]) : base.minVelocity,
    pitchBendRangeSemitones: pbRange ? parseValue14(pbRange[0], pbRange[1]) : base.pitchBendRangeSemitones,
  };
}

function decodeCvOutput(entry: ObjectRecords | undefined, unknown: Record4[]): { source: CvSource } {
  if (!entry) return { source: { type: "disabled" } };
  const known = new Set<number>([PARAM.SRC, PARAM.CHAN, PARAM.TRANSPOSE, PARAM.PITCH_SCHEME, PARAM.VOLTS]);
  entry.params.forEach((v, param) => {
    if (!known.has(param)) unknown.push([entry.object, param, v[0], v[1]]);
  });
  const src = entry.params.get(PARAM.SRC);
  const chan = entry.params.get(PARAM.CHAN);
  const transpose = entry.params.get(PARAM.TRANSPOSE);
  const pitchScheme = entry.params.get(PARAM.PITCH_SCHEME);
  const volts = entry.params.get(PARAM.VOLTS);
  const maxVolts = volts ? parseValue14(volts[0], volts[1]) : 5;

  if (!src || src[0] === SRC_HI.DISABLE) return { source: { type: "disabled" } };

  const stackIndex = STACK_SRC_HI_TO_INDEX[src[0]];
  if (stackIndex) {
    if (src[1] === SRC_LO_STACK.VELOCITY) {
      return { source: { type: "velocity", noteInput: stackIndex, maxVolts } };
    }
    if (STACK_NOTE_SLOT_LO.has(src[1])) {
      return {
        source: {
          type: "pitch",
          noteInput: stackIndex,
          transposeSemitones: transpose ? parseValue14(transpose[0], transpose[1]) - TRANSPOSE_NONE : 0,
          // cv_nrpn() reads NRPNL_PITCH_SCHEME from value_lo, not value_hi.
          pitchScheme: pitchScheme ? WIRE_TO_PITCH_SCHEME[pitchScheme[1]] ?? "v-oct" : "v-oct",
          maxVolts,
        },
      };
    }
    // value_lo is a stack SRC value this app doesn't model (e.g.
    // ANY_NOTES/NO_NOTES) -- cv_nrpn()'s inner switch has no case for it,
    // so on real hardware it's a no-op; preserve the record rather than
    // guessing a source type for it.
    unknown.push([entry.object, PARAM.SRC, src[0], src[1]]);
    return { source: { type: "disabled" } };
  }
  if (src[0] === SRC_HI.MIDI_CC) {
    return {
      source: {
        type: "cc",
        channel: chan ? parseChannel(chan[0], chan[1]) : { mode: "specific", channel: 1 },
        cc: src[1],
        maxVolts,
      },
    };
  }
  if (src[0] === SRC_HI.MIDI_BEND) {
    return {
      source: { type: "pitch-bend", channel: chan ? parseChannel(chan[0], chan[1]) : { mode: "specific", channel: 1 }, maxVolts },
    };
  }
  if (src[0] === SRC_HI.MIDI_TOUCH) {
    return {
      source: { type: "aftertouch", channel: chan ? parseChannel(chan[0], chan[1]) : { mode: "specific", channel: 1 }, maxVolts },
    };
  }
  if (src[0] === SRC_HI.MIDI_TICK) {
    return { source: { type: "clock-bpm", maxVolts } };
  }
  if (src[0] === SRC_HI.TEST_VOLTAGE) {
    return { source: { type: "fixed", volts: maxVolts } };
  }
  // Unrecognised source encoding: preserve the SRC record itself rather than guessing.
  unknown.push([entry.object, PARAM.SRC, src[0], src[1]]);
  return { source: { type: "disabled" } };
}

function decodeGateOutput(entry: ObjectRecords | undefined, unknown: Record4[]): GateOutputSettings {
  const disabled: GateOutputSettings = { source: { type: "disabled" }, duration: { mode: "gate" } };
  if (!entry) return disabled;
  const known = new Set<number>([
    PARAM.SRC,
    PARAM.CHAN,
    PARAM.TICK_OFS,
    PARAM.GATE_DUR,
    PARAM.THRESHOLD,
    PARAM.NOTE_MAX,
    PARAM.VEL_MIN,
  ]);
  entry.params.forEach((v, param) => {
    if (!known.has(param)) unknown.push([entry.object, param, v[0], v[1]]);
  });
  const src = entry.params.get(PARAM.SRC);
  const chan = entry.params.get(PARAM.CHAN);
  // TICK_OFS (initial clock tick count) isn't modeled as a UI-facing field
  // yet; it's declared "known" above so it round-trips silently rather than
  // being flagged as an unknown record.
  const gateDur = entry.params.get(PARAM.GATE_DUR);
  const threshold = entry.params.get(PARAM.THRESHOLD);
  const noteMax = entry.params.get(PARAM.NOTE_MAX);
  const velMin = entry.params.get(PARAM.VEL_MIN);

  const duration: GateOutputSettings["duration"] = (() => {
    if (!gateDur) return { mode: "gate" };
    switch (gateDur[0]) {
      case DUR_MODE.MILLISECONDS:
        return { mode: "trigger", durationMs: gateDur[1] };
      case DUR_MODE.RETRIGGER:
        return { mode: "retrigger", durationMs: gateDur[1] };
      case DUR_MODE.GLOBAL:
        return { mode: "global" };
      default:
        return { mode: "gate" };
    }
  })();

  if (!src || src[0] === SRC_HI.DISABLE) return disabled;

  let source: GateSource;
  const stackIndex = STACK_SRC_HI_TO_INDEX[src[0]];
  const defaultChan: MidiChannelSel = { mode: "specific", channel: 1 };
  if (stackIndex) {
    if (!STACK_NOTE_SLOT_LO.has(src[1])) {
      // gate_nrpn() maps value_lo === NOTE1..4 to GATE_NOTE_GATEA..D
      // ("note-gate" here); ANY_NOTES/NO_NOTES select different real
      // modes (GATE_NOTE_ON / GATE_NOTES_OFF) that aren't modeled in the
      // UI yet -- preserve rather than mislabel.
      unknown.push([entry.object, PARAM.SRC, src[0], src[1]]);
      return disabled;
    }
    source = { type: "note-gate", noteInput: stackIndex };
  } else if (src[0] === SRC_HI.MIDI_NOTE) {
    source = {
      type: "midi-note",
      channel: chan ? parseChannel(chan[0], chan[1]) : defaultChan,
      note: src[1],
      ...(noteMax ? { noteMax: noteMax[1] } : {}),
      ...(velMin ? { minVelocity: velMin[1] } : {}),
    };
  } else if (src[0] === SRC_HI.MIDI_TICK_RUN || src[0] === SRC_HI.MIDI_TICK) {
    // gate_nrpn(): the clock division lives in the SRC record's own
    // value_lo (0 falls back to DEFAULT_GATE_DIV=6 on-device). tickOfs is
    // a separate, unrelated "initial tick count" field.
    const ticks = src[1] || 6;
    source = {
      type: "clock",
      division: TICKS_TO_DIVISION[ticks] ?? "1/16",
      onlyWhileRunning: src[0] === SRC_HI.MIDI_TICK_RUN,
    };
  } else if (src[0] === SRC_HI.MIDI_START) {
    source = { type: "transport-start" };
  } else if (src[0] === SRC_HI.MIDI_STOP) {
    source = { type: "transport-stop" };
  } else if (src[0] === SRC_HI.MIDI_RUN) {
    source = { type: "transport-run" };
  } else if (src[0] === SRC_HI.MIDI_START_STOP) {
    source = { type: "transport-start-stop" };
  } else if (src[0] === SRC_HI.MIDI_CC) {
    source = {
      type: "cc-above",
      channel: chan ? parseChannel(chan[0], chan[1]) : defaultChan,
      cc: src[1],
      threshold: threshold ? parseValue14(threshold[0], threshold[1]) : 64,
    };
  } else if (src[0] === SRC_HI.MIDI_CC_NEG) {
    source = {
      type: "cc-below",
      channel: chan ? parseChannel(chan[0], chan[1]) : defaultChan,
      cc: src[1],
      threshold: threshold ? parseValue14(threshold[0], threshold[1]) : 64,
    };
  } else {
    unknown.push([entry.object, PARAM.SRC, src[0], src[1]]);
    return disabled;
  }

  return { source, duration };
}

/** Decode raw Mutant Brain SysEx bytes into the typed patch model. */
export function decodeSysex(bytes: Uint8Array): MutantBrainPatch {
  if (bytes.length < 6 || bytes[0] !== SYSEX_START || bytes[bytes.length - 1] !== SYSEX_END) {
    throw new ProtocolError("This file is not a Mutant Brain SysEx configuration.");
  }
  const [h0, h1, h2] = SYSEX_HEADER;
  if (bytes[1] !== h0 || bytes[2] !== h1 || bytes[3] !== h2) {
    throw new ProtocolError("This file is not a Mutant Brain SysEx configuration.");
  }

  const body = bytes.slice(4, bytes.length - 1);
  const records = splitRecords(body);

  const knownObjects = new Set<number>([
    OBJECT.GLOBAL,
    ...NOTE_INPUT_OBJECTS,
    ...CV_OBJECTS,
    ...GATE_OBJECTS,
  ]);

  const unknown: Record4[] = [];
  const byObject = groupByObject(records, knownObjects, unknown);

  const patch = defaultPatch();
  patch.globals = decodeGlobals(byObject.get(OBJECT.GLOBAL), unknown);
  patch.noteInputs = NOTE_INPUT_OBJECTS.map((obj) => decodeNoteInput(byObject.get(obj), unknown)) as MutantBrainPatch["noteInputs"];
  patch.cvOutputs = CV_OBJECTS.map((obj) => decodeCvOutput(byObject.get(obj), unknown)) as MutantBrainPatch["cvOutputs"];
  patch.gateOutputs = GATE_OBJECTS.map((obj) => decodeGateOutput(byObject.get(obj), unknown)) as MutantBrainPatch["gateOutputs"];

  if (unknown.length > 0) {
    patch.unknownRecords = unknown;
  }

  return patch;
}
