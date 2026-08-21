import type {
  CvOutputSettings,
  GateOutputSettings,
  MutantBrainPatch,
  NoteInputSettings,
} from "../protocol/types";

function blankNoteInput(channel: number): NoteInputSettings {
  return {
    enabled: false,
    channel: { mode: "specific", channel },
    priority: "last",
    noteMin: 0,
    noteMax: 0,
    minVelocity: 0,
    pitchBendRangeSemitones: 2,
  };
}

function disabledCv(): CvOutputSettings {
  return { source: { type: "disabled" } };
}

function disabledGate(): GateOutputSettings {
  return { source: { type: "disabled" }, duration: { mode: "gate" } };
}

/** A fully blank, everything-disabled patch. Used as the base for all profiles. */
export function defaultPatch(): MutantBrainPatch {
  return {
    version: 1,
    name: "Blank",
    globals: { midiChannel: 1, defaultTriggerDurationMs: 10 },
    noteInputs: [1, 2, 3, 4].map(blankNoteInput) as MutantBrainPatch["noteInputs"],
    cvOutputs: [disabledCv(), disabledCv(), disabledCv(), disabledCv()],
    gateOutputs: Array.from({ length: 12 }, disabledGate) as MutantBrainPatch["gateOutputs"],
  };
}

function fourMonoVoices(): MutantBrainPatch {
  const p = defaultPatch();
  p.name = "4 Mono Voices";
  for (let v = 0; v < 4; v++) {
    p.noteInputs[v] = {
      enabled: true,
      channel: { mode: "specific", channel: v + 1 },
      priority: "last",
      noteMin: 0,
      noteMax: 0,
      minVelocity: 0,
      pitchBendRangeSemitones: 2,
    };
    p.cvOutputs[v] = {
      source: { type: "pitch", noteInput: v + 1, transposeSemitones: 0, pitchScheme: "v-oct", maxVolts: 5 },
    };
    p.gateOutputs[v] = {
      source: { type: "note-gate", noteInput: v + 1 },
      duration: { mode: "gate" },
    };
  }
  return p;
}

function fourVoicePoly(): MutantBrainPatch {
  const p = defaultPatch();
  p.name = "4 Voice Poly";
  p.noteInputs[0] = {
    enabled: true,
    channel: { mode: "specific", channel: 1 },
    priority: "chord-4",
    noteMin: 0,
    noteMax: 0,
    minVelocity: 0,
    pitchBendRangeSemitones: 2,
  };
  for (let v = 0; v < 4; v++) {
    p.cvOutputs[v] = {
      source: { type: "pitch", noteInput: 1, transposeSemitones: 0, pitchScheme: "v-oct", maxVolts: 5 },
    };
    p.gateOutputs[v] = { source: { type: "note-gate", noteInput: 1 }, duration: { mode: "gate" } };
  }
  return p;
}

function monoPlusDrums(): MutantBrainPatch {
  const p = defaultPatch();
  p.name = "Mono + Drums";
  p.noteInputs[0] = {
    enabled: true,
    channel: { mode: "specific", channel: 1 },
    priority: "last",
    noteMin: 0,
    noteMax: 0,
    minVelocity: 0,
    pitchBendRangeSemitones: 2,
  };
  p.cvOutputs[0] = {
    source: { type: "pitch", noteInput: 1, transposeSemitones: 0, pitchScheme: "v-oct", maxVolts: 5 },
  };
  p.gateOutputs[0] = { source: { type: "note-gate", noteInput: 1 }, duration: { mode: "gate" } };
  const drumNotes = [36, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47];
  for (let i = 0; i < 11; i++) {
    p.gateOutputs[i + 1] = {
      source: { type: "midi-note", channel: { mode: "specific", channel: 10 }, note: drumNotes[i] },
      duration: { mode: "trigger", durationMs: 10 },
    };
  }
  return p;
}

function drums(): MutantBrainPatch {
  const p = defaultPatch();
  p.name = "Drums";
  const drumNotes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47];
  for (let i = 0; i < 12; i++) {
    p.gateOutputs[i] = {
      source: { type: "midi-note", channel: { mode: "specific", channel: 10 }, note: drumNotes[i] },
      duration: { mode: "trigger", durationMs: 10 },
    };
  }
  return p;
}

function clockAndTransport(): MutantBrainPatch {
  const p = defaultPatch();
  p.name = "Clock & Transport";
  p.gateOutputs[8] = { source: { type: "clock", division: "1/16" }, duration: { mode: "trigger", durationMs: 5 } };
  p.gateOutputs[9] = { source: { type: "clock", division: "1/8" }, duration: { mode: "trigger", durationMs: 5 } };
  p.gateOutputs[10] = { source: { type: "clock", division: "24ppqn" }, duration: { mode: "trigger", durationMs: 2 } };
  p.gateOutputs[11] = { source: { type: "transport-run" }, duration: { mode: "gate" } };
  return p;
}

export interface BuiltinProfile {
  id: string;
  name: string;
  description: string;
  build: () => MutantBrainPatch;
}

export const BUILTIN_PROFILES: BuiltinProfile[] = [
  { id: "blank", name: "Blank", description: "Everything disabled.", build: defaultPatch },
  {
    id: "4-mono-voices",
    name: "4 Mono Voices",
    description: "CV A-D pitch + Gate 1-4, MIDI channels 1-4.",
    build: fourMonoVoices,
  },
  {
    id: "4-voice-poly",
    name: "4 Voice Poly",
    description: "One MIDI channel distributed across four pitch CVs and gates.",
    build: fourVoicePoly,
  },
  {
    id: "mono-drums",
    name: "Mono + Drums",
    description: "CV A + Gate 1 melodic voice, remaining gates as drum triggers.",
    build: monoPlusDrums,
  },
  {
    id: "drums",
    name: "Drums",
    description: "12 individually configurable MIDI note triggers.",
    build: drums,
  },
  {
    id: "clock-transport",
    name: "Clock & Transport",
    description: "Clock divisions, 24 PPQN and transport run gates.",
    build: clockAndTransport,
  },
];
