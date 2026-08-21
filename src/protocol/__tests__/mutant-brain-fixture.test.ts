import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeSysex } from "../decode";
import { encodeSysex } from "../encode";

/**
 * THE primary correctness milestone (spec item 16 / 26): a real Mutant
 * Brain SysEx capture, supplied by the user --
 * `live - 4 notes -8 channels midi + 2 clocks + 24ppq + run.syx`, captured
 * from an actual device (not CV.OCD's own default patch, unlike
 * `fixture.test.ts` / `cvocd_default.syx`).
 *
 * The patch: 4 note inputs (channels 1-4, one per CV+gate pair -- "4
 * notes"), gates 5-8 as raw MIDI-note triggers on channels 5-8 ("8
 * channels midi" = 4 note-input channels + 4 raw-trigger channels), gates
 * 9-10 as free-running clock pulses at 1/16 and 1/8 ("2 clocks"), gate 11
 * as a free-running 24 PPQN pulse ("24ppq"), and gate 12 as a
 * transport-run gate ("run").
 *
 * This fixture caught three bugs the CV.OCD-fixture and self-consistency
 * tests could not, because they're all cases where the app's encoder and
 * decoder agreed with *each other* but not with real firmware:
 *
 *   1. CV "pitch" and gate "note-gate" wrote SRC value_lo = ANY_NOTES(5)
 *      instead of NOTE_1(1). For CV, `cv_nrpn()`'s inner switch has no
 *      case for value_lo=5, so real hardware would silently ignore the
 *      record and leave that CV unconfigured. For gates, value_lo=5 maps
 *      to a *different* real firmware mode (GATE_NOTE_ON, "any note
 *      held") rather than being a no-op -- so it wasn't just inert, it
 *      was wrong.
 *   2. Clock gates always encoded SRC_HI.MIDI_TICK_RUN ("only while
 *      transport running"), silently discarding the "always ticking"
 *      variant (SRC_HI.MIDI_TICK) this real patch actually uses for gates
 *      9-11 on every decode -> encode cycle.
 *   3. (Also present, not fixture-specific) the value_hi/value_lo swaps
 *      and channel off-by-one documented in PROTOCOL_NOTES.md and covered
 *      by `fixture.test.ts`.
 */
function loadFixture(): Uint8Array {
  const path = join(__dirname, "fixtures", "mutant_brain_live.syx");
  return new Uint8Array(readFileSync(path));
}

describe("mutant_brain_live.syx fixture (real device capture)", () => {
  it("is framed exactly as the spec's supplied fixture describes (329 bytes, 81 records)", () => {
    const bytes = loadFixture();
    expect(bytes.length).toBe(329);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0xf0, 0x00, 0x7f, 0x15]);
    expect(bytes[bytes.length - 1]).toBe(0xf7);
    expect((bytes.length - 5) / 4).toBe(81);
  });

  it("decodes the '4 notes' note inputs on channels 1-4, priority HIGH", () => {
    const patch = decodeSysex(loadFixture());
    for (let i = 0; i < 4; i++) {
      expect(patch.noteInputs[i].enabled).toBe(true);
      expect(patch.noteInputs[i].channel).toEqual({ mode: "specific", channel: i + 1 });
      expect(patch.noteInputs[i].priority).toBe("highest");
    }
  });

  it("decodes CV A-D as pitch from note inputs 1-4 (the ANY_NOTES vs NOTE_1 bug case)", () => {
    const patch = decodeSysex(loadFixture());
    patch.cvOutputs.forEach((cv, i) => {
      expect(cv.source.type).toBe("pitch");
      if (cv.source.type === "pitch") {
        expect(cv.source.noteInput).toBe(i + 1);
        expect(cv.source.pitchScheme).toBe("v-oct");
      }
    });
  });

  it("decodes gates 1-4 as note-gates for note inputs 1-4 (the ANY_NOTES vs NOTE_1 bug case)", () => {
    const patch = decodeSysex(loadFixture());
    for (let i = 0; i < 4; i++) {
      expect(patch.gateOutputs[i].source).toEqual({ type: "note-gate", noteInput: i + 1 });
    }
  });

  it("decodes gates 5-8 as MIDI-note triggers on channels 5-8, any note, vel>=1 ('8 channels midi')", () => {
    const patch = decodeSysex(loadFixture());
    for (let i = 0; i < 4; i++) {
      const source = patch.gateOutputs[4 + i].source;
      expect(source.type).toBe("midi-note");
      if (source.type === "midi-note") {
        expect(source.channel).toEqual({ mode: "specific", channel: 5 + i });
        // note=0, noteMax=127 -> full-range "any note" trigger; a real,
        // commonly-used firmware pattern (NOTE_MAX/VEL_MIN on
        // T_GATE_MIDI_NOTE), not a note-range this app invented.
        expect(source.note).toBe(0);
        expect(source.noteMax).toBe(127);
        expect(source.minVelocity).toBe(1);
      }
    }
  });

  it("decodes gates 9-11 as free-running clock pulses -- 1/16, 1/8, 24ppqn (the MIDI_TICK vs MIDI_TICK_RUN bug case)", () => {
    const patch = decodeSysex(loadFixture());
    expect(patch.gateOutputs[8].source).toEqual({ type: "clock", division: "1/16", onlyWhileRunning: false });
    expect(patch.gateOutputs[9].source).toEqual({ type: "clock", division: "1/8", onlyWhileRunning: false });
    expect(patch.gateOutputs[10].source).toEqual({ type: "clock", division: "24ppqn", onlyWhileRunning: false });
  });

  it("decodes gate 12 as a transport-run gate", () => {
    const patch = decodeSysex(loadFixture());
    expect(patch.gateOutputs[11].source).toEqual({ type: "transport-run" });
  });

  it("round-trips: decode -> encode -> decode is semantically identical to the first decode", () => {
    // Not asserting byte-identical output: this app's encoder makes
    // different (still firmware-valid) choices than whatever produced
    // this file for a few unmodeled fields (field order, the unused
    // TICK_OFS param, and omitting a VOLTS record for pitch CVs, which
    // real firmware ignores for CV_NOTE mode). What must hold is that the
    // *meaning* survives the round trip.
    const bytes = loadFixture();
    const decoded1 = decodeSysex(bytes);
    const reencoded = encodeSysex(decoded1);
    const decoded2 = decodeSysex(reencoded);
    expect(decoded2).toEqual(decoded1);
  });
});
