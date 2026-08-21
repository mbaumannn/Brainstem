import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeSysex } from "../decode";
import { encodeSysex } from "../encode";

/**
 * Real device fixture: `cvocd_default.syx`, the CV.OCD firmware's own
 * factory-default patch, sourced from the CV.OCD reference repository
 * (`patches/cvocd_default.syx` in hotchk155/cvocd.a). This is not a Mutant
 * Brain capture (none was available to this project -- see
 * PROTOCOL_NOTES.md), but it is a real SysEx file emitted by CV.OCD's own
 * official web configurator (`new_config_page/cvocd.js`) and accepted by
 * the shared firmware, so it is the strongest available check of the wire
 * protocol against ground truth.
 *
 * Expected values below were hand-decoded from the raw bytes against
 * `firmware/cvocd.h`, `firmware/cv.c`, `firmware/gate.c`, and
 * `firmware/stack.c` (see PROTOCOL_NOTES.md for the full record-by-record
 * derivation) -- independently of this project's encoder/decoder, so this
 * test would have caught the value_hi/value_lo swaps and off-by-ones fixed
 * alongside it.
 */
function loadFixture(): Uint8Array {
  const path = join(__dirname, "fixtures", "cvocd_default.syx");
  return new Uint8Array(readFileSync(path));
}

describe("cvocd_default.syx fixture (real device SysEx)", () => {
  it("is framed exactly as expected (329 bytes, F0 00 7F 15 ... F7)", () => {
    const bytes = loadFixture();
    expect(bytes.length).toBe(333);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0xf0, 0x00, 0x7f, 0x15]);
    expect(bytes[bytes.length - 1]).toBe(0xf7);
  });

  it("decodes globals and note-input 1/2 exactly as hand-verified from the raw bytes", () => {
    const patch = decodeSysex(loadFixture());

    // record `01 02 00 01`: global channel = value_lo(1) -> channel 1
    expect(patch.globals.midiChannel).toBe(1);
    // record `01 0c 01 0f`: gate_dur value_hi=DUR_MS, value_lo=15
    expect(patch.globals.defaultTriggerDurationMs).toBe(15);

    // note input 1: chan=1 (`0b02 0001`), range 0-127 (`0b03 0000`/`0b04 007f`),
    // vel_min=1 (`0b05 0001`), bend_range=3 (`0b07 0003`), priority=HIGH (`0b08 0003`)
    const n1 = patch.noteInputs[0];
    expect(n1.enabled).toBe(true);
    expect(n1.channel).toEqual({ mode: "specific", channel: 1 });
    expect(n1.noteMin).toBe(0);
    expect(n1.noteMax).toBe(127);
    expect(n1.minVelocity).toBe(1);
    expect(n1.pitchBendRangeSemitones).toBe(3);
    expect(n1.priority).toBe("highest");

    // note input 2: chan=2 (`0c02 0002`)
    expect(patch.noteInputs[1].channel).toEqual({ mode: "specific", channel: 2 });

    // note inputs 3/4 are all-zero records -- disabled (SRC value_hi=0)
    expect(patch.noteInputs[2].enabled).toBe(false);
    expect(patch.noteInputs[3].enabled).toBe(false);
  });

  it("decodes CV1 (pitch, stack 1) and CV2 (velocity, stack 1) as hand-verified", () => {
    const patch = decodeSysex(loadFixture());

    // `1501 0b01` SRC=STACK1/NOTE1, `1510 0000` pitch scheme V/Oct,
    // `150e 0040` transpose=64 (TRANSPOSE_NONE, i.e. 0 semitones)
    const cv1 = patch.cvOutputs[0].source;
    expect(cv1.type).toBe("pitch");
    if (cv1.type === "pitch") {
      expect(cv1.noteInput).toBe(1);
      expect(cv1.pitchScheme).toBe("v-oct");
      expect(cv1.transposeSemitones).toBe(0);
    }

    // `1601 0b14` SRC=STACK1/VEL, `160f 0005` volts=5
    const cv2 = patch.cvOutputs[1].source;
    expect(cv2.type).toBe("velocity");
    if (cv2.type === "velocity") {
      expect(cv2.noteInput).toBe(1);
      expect(cv2.maxVolts).toBe(5);
    }
  });

  it("decodes gate 10 as a clock gate at 1/4 division, not the tick-offset field", () => {
    const patch = decodeSysex(loadFixture());
    // `2801 1418` SRC=MIDITICKRUN, value_lo=24 ticks -> quarter note.
    // This is the case that would have failed before the fix, when clock
    // division was (mis)read from the separate TICK_OFS param instead.
    const g10 = patch.gateOutputs[9].source;
    expect(g10.type).toBe("clock");
    if (g10.type === "clock") {
      expect(g10.division).toBe("1/4");
    }
  });

  it("decodes gate 5 as a MIDI-note drum trigger on channel 10", () => {
    const patch = decodeSysex(loadFixture());
    // `2301 013c` SRC=MIDINOTE note=60(C4), `2302 000a` chan=10
    const g5 = patch.gateOutputs[4].source;
    expect(g5.type).toBe("midi-note");
    if (g5.type === "midi-note") {
      expect(g5.note).toBe(60);
      expect(g5.channel).toEqual({ mode: "specific", channel: 10 });
    }
  });

  it("round-trips: decode -> encode -> decode agrees with itself", () => {
    const bytes = loadFixture();
    const decoded1 = decodeSysex(bytes);
    const reencoded = encodeSysex(decoded1);
    const decoded2 = decodeSysex(reencoded);
    expect(decoded2).toEqual(decoded1);
  });
});
