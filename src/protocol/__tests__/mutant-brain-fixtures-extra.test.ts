import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeSysex } from "../decode";
import { encodeSysex } from "../encode";

/**
 * Four more real Mutant Brain captures, supplied by the user, covering
 * patch shapes not exercised by `mutant-brain-fixture.test.ts`:
 * MIDI-CC-sourced CVs (mod wheel), mixed hold/trigger/global gate
 * durations on the same patch, non-1/16 clock divisions (1/32), MS-mode
 * (not just global-mode) durations on clock/transport gates, and 2-voice
 * (not 4-voice) note-input layouts. Each is asserted for (a) decoding
 * without throwing, (b) zero leftover unknown records (every field these
 * patches use is modeled), and (c) decode -> encode -> decode stability.
 */
const files = [
  "mb_transpose_mod.syx",
  "mb_4notes_10mstrig.syx",
  "mb_8ch_midi.syx",
  "mb_mutantbrain.syx",
  "mb_0222_no_run.syx",
];

function loadFixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(__dirname, "fixtures", name)));
}

describe.each(files)("real fixture: %s", (file) => {
  it("decodes without throwing and leaves no unmodeled records", () => {
    const patch = decodeSysex(loadFixture(file));
    expect(patch.unknownRecords ?? []).toEqual([]);
  });

  it("round-trips: decode -> encode -> decode is semantically identical", () => {
    const decoded1 = decodeSysex(loadFixture(file));
    const reencoded = encodeSysex(decoded1);
    const decoded2 = decodeSysex(reencoded);
    expect(decoded2).toEqual(decoded1);
  });
});

describe("mb_8ch_midi.syx / mb_mutantbrain.syx (byte-identical captures)", () => {
  it("decode to the same patch", () => {
    expect(decodeSysex(loadFixture("mb_8ch_midi.syx"))).toEqual(decodeSysex(loadFixture("mb_mutantbrain.syx")));
  });
});

describe("mb_8ch_midi.syx", () => {
  it("decodes 2 note inputs (channels 1-2), 2 CC-sourced CVs (mod wheel), 2 note-gates + 6 MIDI-note gates", () => {
    const patch = decodeSysex(loadFixture("mb_8ch_midi.syx"));

    expect(patch.noteInputs[0].enabled).toBe(true);
    expect(patch.noteInputs[1].enabled).toBe(true);
    expect(patch.noteInputs[2].enabled).toBe(false);
    expect(patch.noteInputs[3].enabled).toBe(false);

    expect(patch.cvOutputs[0].source).toMatchObject({ type: "pitch", noteInput: 1 });
    expect(patch.cvOutputs[1].source).toMatchObject({ type: "pitch", noteInput: 2 });
    expect(patch.cvOutputs[2].source).toEqual({ type: "cc", channel: { mode: "specific", channel: 1 }, cc: 1, maxVolts: 5 });
    expect(patch.cvOutputs[3].source).toEqual({ type: "cc", channel: { mode: "specific", channel: 2 }, cc: 1, maxVolts: 5 });

    expect(patch.gateOutputs[0].source).toEqual({ type: "note-gate", noteInput: 1 });
    expect(patch.gateOutputs[1].source).toEqual({ type: "note-gate", noteInput: 2 });
    for (let i = 2; i < 8; i++) {
      const source = patch.gateOutputs[i].source;
      expect(source.type).toBe("midi-note");
      if (source.type === "midi-note") {
        expect(source.channel).toEqual({ mode: "specific", channel: i + 1 });
        expect(source.noteMax).toBe(127);
        expect(source.minVelocity).toBe(1);
      }
    }
  });
});

describe("mb_0222_no_run.syx", () => {
  it("decodes gate 11 as a 1/32 clock with a 13ms trigger duration", () => {
    const patch = decodeSysex(loadFixture("mb_0222_no_run.syx"));
    expect(patch.gateOutputs[10]).toEqual({
      source: { type: "clock", division: "1/32", onlyWhileRunning: false },
      duration: { mode: "trigger", durationMs: 13 },
    });
  });
});

describe("mb_transpose_mod.syx", () => {
  it("decodes 3 pitch voices (note inputs 1-3) plus a 4th CC-sourced (mod) CV", () => {
    const patch = decodeSysex(loadFixture("mb_transpose_mod.syx"));
    expect(patch.cvOutputs[0].source).toMatchObject({ type: "pitch", noteInput: 1 });
    expect(patch.cvOutputs[1].source).toMatchObject({ type: "pitch", noteInput: 2 });
    expect(patch.cvOutputs[2].source).toMatchObject({ type: "pitch", noteInput: 3 });
    expect(patch.cvOutputs[3].source).toEqual({ type: "cc", channel: { mode: "specific", channel: 3 }, cc: 1, maxVolts: 5 });
  });

  it("decodes a 1ms global trigger duration default", () => {
    const patch = decodeSysex(loadFixture("mb_transpose_mod.syx"));
    expect(patch.globals.defaultTriggerDurationMs).toBe(1);
  });
});
