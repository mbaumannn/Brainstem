/**
 * Mutant Brain / CV.OCD SysEx protocol constants.
 *
 * The Mutant Brain shares its MIDI-to-CV configuration heritage with
 * hotchk155's CV.OCD module. Both devices are configured over MIDI SysEx
 * using the same NRPN-derived record format:
 *
 *   F0 00 7F 15 [object] [param] [value-hi] [value-lo] ... F7
 *
 * Each 4-byte record after the header is one "NRPN-style" parameter write:
 * `object` is the NRPN high byte (which sub-system: globals / note input /
 * CV output / gate output), `param` is the NRPN low byte (which field of
 * that sub-system), and `value-hi`/`value-lo` form a 14-bit value exactly
 * as MIDI NRPN data would.
 *
 * Source: hotchk155/cvocd.a firmware (firmware/cvocd.h, firmware/cvocd.c,
 * firmware/gate.c), verified against the vendor's documented SysEx header
 * (F0 00 7F 15) and record shape described for the Mutant Brain. Firmware
 * feature availability (which sources / modes are actually reachable from
 * Mutant Brain Surgery) is treated as the authoritative product surface;
 * CV.OCD is used only to confirm the byte-level protocol.
 *
 * NOTE: We were not able to reach a real captured Mutant Brain .syx fixture
 * or the vendor's PDF manual from this environment (network policy blocked
 * fetching the manual/binary fixture and the CV.OCD repository's default
 * branch could not be enumerated). Everything below was cross-checked
 * against the CV.OCD firmware headers, which is the closest verifiable
 * primary source available. See PROTOCOL_NOTES.md for the full findings
 * log and what remains to be verified against a real device/fixture.
 */

export const SYSEX_START = 0xf0;
export const SYSEX_END = 0xf7;

/** Manufacturer / device ID bytes that open every Mutant Brain SysEx message. */
export const SYSEX_HEADER = [0x00, 0x7f, 0x15] as const;

export const RECORD_LENGTH = 4;

/** NRPN "object" (high byte) selecting which sub-system a record configures. */
export const OBJECT = {
  GLOBAL: 0x01,
  NOTE_INPUT_1: 0x0b,
  NOTE_INPUT_2: 0x0c,
  NOTE_INPUT_3: 0x0d,
  NOTE_INPUT_4: 0x0e,
  CV_1: 0x15,
  CV_2: 0x16,
  CV_3: 0x17,
  CV_4: 0x18,
  GATE_1: 0x1f,
  GATE_2: 0x20,
  GATE_3: 0x21,
  GATE_4: 0x22,
  GATE_5: 0x23,
  GATE_6: 0x24,
  GATE_7: 0x25,
  GATE_8: 0x26,
  GATE_9: 0x27,
  GATE_10: 0x28,
  GATE_11: 0x29,
  GATE_12: 0x2a,
} as const;

export const NOTE_INPUT_OBJECTS = [
  OBJECT.NOTE_INPUT_1,
  OBJECT.NOTE_INPUT_2,
  OBJECT.NOTE_INPUT_3,
  OBJECT.NOTE_INPUT_4,
] as const;

export const CV_OBJECTS = [OBJECT.CV_1, OBJECT.CV_2, OBJECT.CV_3, OBJECT.CV_4] as const;

export const GATE_OBJECTS = [
  OBJECT.GATE_1,
  OBJECT.GATE_2,
  OBJECT.GATE_3,
  OBJECT.GATE_4,
  OBJECT.GATE_5,
  OBJECT.GATE_6,
  OBJECT.GATE_7,
  OBJECT.GATE_8,
  OBJECT.GATE_9,
  OBJECT.GATE_10,
  OBJECT.GATE_11,
  OBJECT.GATE_12,
] as const;

/** NRPN "param" (low byte) selecting a field within a sub-system record. */
export const PARAM = {
  SRC: 0x01,
  CHAN: 0x02,
  NOTE_MIN: 0x03,
  NOTE: 0x03,
  NOTE_MAX: 0x04,
  VEL_MIN: 0x05,
  PB_RANGE: 0x07,
  PRIORITY: 0x08,
  TICK_OFS: 0x0b,
  GATE_DUR: 0x0c,
  THRESHOLD: 0x0d,
  TRANSPOSE: 0x0e,
  VOLTS: 0x0f,
  PITCH_SCHEME: 0x10,
  CAL_SCALE: 0x62,
  CAL_OFS: 0x63,
  SAVE: 0x64,
} as const;

/** High byte of the SRC parameter's 14-bit value: what kind of source. */
export const SRC_HI = {
  DISABLE: 0,
  MIDI_NOTE: 1,
  MIDI_CC: 2,
  MIDI_CC_NEG: 3,
  MIDI_BEND: 4,
  MIDI_TOUCH: 5,
  STACK_1: 11,
  STACK_2: 12,
  STACK_3: 13,
  STACK_4: 14,
  MIDI_TICK: 20,
  MIDI_TICK_RUN: 21,
  MIDI_RUN: 22,
  MIDI_START: 23,
  MIDI_STOP: 25,
  MIDI_START_STOP: 26,
  TEST_VOLTAGE: 127,
} as const;

/** Low byte of the SRC value when SRC_HI selects a note-input "stack". */
export const SRC_LO_STACK = {
  NO_NOTES: 0,
  NOTE_1: 1,
  NOTE_2: 2,
  NOTE_3: 3,
  NOTE_4: 4,
  ANY_NOTES: 5,
  VELOCITY: 20,
} as const;

/** CHAN parameter high-byte special values (in addition to 1-16 explicit channels). */
export const CHAN_SPECIAL = {
  SPECIFIC: 0,
  OMNI: 1,
  GLOBAL: 2,
} as const;

/** GATE_DUR parameter high-byte: how the gate/trigger/retrigger duration behaves. */
export const DUR_MODE = {
  INFINITE: 0,
  MILLISECONDS: 1,
  GLOBAL: 2,
  RETRIGGER: 3,
} as const;

/** PITCH_SCHEME values for note-input pitch CV. */
export const PITCH_SCHEME = {
  V_OCT: 0,
  HZ_V: 1,
  V12_OCT: 2,
} as const;

/** Note priority / voicing mode for a note input ("stack"). */
export const PRIORITY = {
  LAST: 0,
  LOW: 1,
  HIGH: 3,
  CYCLE_2: 6,
  CYCLE_3: 7,
  CYCLE_4: 8,
  CHORD_2: 9,
  CHORD_3: 10,
  CHORD_4: 11,
  PARAPHONIC: 12,
  PARAPHONIC_RELEASE: 13,
} as const;

export const TRANSPOSE_NONE = 64;

export const DEFAULTS = {
  GATE_NOTE: 60,
  GATE_CC: 1,
  GATE_CC_THRESHOLD: 64,
  GATE_DIV: 6,
  GATE_DURATION_MS: 10,
  ACCENT_VELOCITY: 127,
  MIDI_CHANNEL: 0,
  CV_MAX_VOLTS: 5,
} as const;

/**
 * MIDI clock division, stored on-device as a raw tick count (24 PPQN per
 * quarter note). DEFAULT_GATE_DIV = 6 in firmware corresponds to a 1/16
 * note, which matches the manual's documented default clock gate.
 */
export const CLOCK_DIVISION_TICKS: Record<string, number> = {
  "24ppqn": 1,
  "1/32": 3,
  "1/16": 6,
  "1/8": 12,
  "1/4": 24,
  "1/2": 48,
  "1/1": 96,
};
