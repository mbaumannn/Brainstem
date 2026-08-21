/** Clean, typed representation of a Mutant Brain configuration ("patch"). */

export type MidiChannelSel =
  | { mode: "specific"; channel: number /* 1-16 */ }
  | { mode: "omni" }
  | { mode: "global" };

export type PitchScheme = "v-oct" | "hz-v" | "12v-oct";

export type NotePriority =
  | "last"
  | "lowest"
  | "highest"
  | "cycle-2"
  | "cycle-3"
  | "cycle-4"
  | "chord-2"
  | "chord-3"
  | "chord-4"
  | "paraphonic"
  | "paraphonic-release";

export interface GlobalSettings {
  midiChannel: number; // 1-16, the device's "default" channel
  defaultTriggerDurationMs: number;
}

export interface NoteInputSettings {
  enabled: boolean;
  channel: MidiChannelSel;
  priority: NotePriority;
  noteMin: number; // 0-127
  noteMax: number; // 0-127, 0 == single note (noteMin only)
  minVelocity: number; // 0-127
  pitchBendRangeSemitones: number;
}

export type ClockDivision = "24ppqn" | "1/32" | "1/16" | "1/8" | "1/4" | "1/2" | "1/1";

/** Which note-input event a CV/gate can react to. */
export type NoteStackEvent = "any-note" | 1 | 2 | 3 | 4 | "velocity";

export type CvSource =
  | { type: "disabled" }
  | {
      type: "pitch";
      noteInput: number; // 1-4, which note input feeds this CV
      transposeSemitones: number; // -64..63, 0 = none
      pitchScheme: PitchScheme;
      maxVolts: number;
    }
  | { type: "velocity"; noteInput: number; maxVolts: number }
  | { type: "cc"; channel: MidiChannelSel; cc: number; maxVolts: number }
  | { type: "pitch-bend"; channel: MidiChannelSel; maxVolts: number }
  | { type: "aftertouch"; channel: MidiChannelSel; maxVolts: number }
  | { type: "clock-bpm"; maxVolts: number }
  | { type: "fixed"; volts: number };

export interface CvOutputSettings {
  source: CvSource;
}

export type GateDuration =
  | { mode: "gate" } // follows source (infinite / held)
  | { mode: "trigger"; durationMs: number }
  | { mode: "retrigger"; durationMs: number }
  | { mode: "global" };

export type GateSource =
  | { type: "disabled" }
  | { type: "note-gate"; noteInput: number } // gate follows note-input N held state
  | { type: "midi-note"; channel: MidiChannelSel; note: number }
  | { type: "clock"; division: ClockDivision }
  | { type: "transport-start" }
  | { type: "transport-stop" }
  | { type: "transport-run" }
  | { type: "transport-start-stop" }
  | { type: "cc-above"; channel: MidiChannelSel; cc: number; threshold: number }
  | { type: "cc-below"; channel: MidiChannelSel; cc: number; threshold: number };

export interface GateOutputSettings {
  source: GateSource;
  duration: GateDuration;
}

export interface MutantBrainPatch {
  version: 1;
  name: string;
  globals: GlobalSettings;
  noteInputs: [NoteInputSettings, NoteInputSettings, NoteInputSettings, NoteInputSettings];
  cvOutputs: [CvOutputSettings, CvOutputSettings, CvOutputSettings, CvOutputSettings];
  gateOutputs: [
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
    GateOutputSettings,
  ];
  /**
   * Raw (object, param, valueHi, valueLo) records that were present in an
   * imported SysEx file but that this version of the app does not model.
   * Preserved so re-exporting a patch doesn't silently drop data it didn't
   * understand (see decode.ts).
   */
  unknownRecords?: Array<[number, number, number, number]>;
}
