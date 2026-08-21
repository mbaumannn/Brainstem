import { describe, expect, test } from "vitest";
import type { MutantBrainPatch } from "../protocol/types";
import { clonePatch, patchesEqual } from "./patch";

function makePatch(name: string): MutantBrainPatch {
  return {
    version: 1,
    name,
    globals: {
      midiChannel: 1,
      defaultTriggerDurationMs: 10,
    },
    noteInputs: [
      { enabled: true, channel: { mode: "global" }, priority: "last", noteMin: 0, noteMax: 0, minVelocity: 0, pitchBendRangeSemitones: 2 },
      { enabled: false, channel: { mode: "omni" }, priority: "lowest", noteMin: 0, noteMax: 0, minVelocity: 0, pitchBendRangeSemitones: 2 },
      { enabled: false, channel: { mode: "specific", channel: 5 }, priority: "highest", noteMin: 0, noteMax: 0, minVelocity: 0, pitchBendRangeSemitones: 2 },
      { enabled: false, channel: { mode: "global" }, priority: "last", noteMin: 0, noteMax: 0, minVelocity: 0, pitchBendRangeSemitones: 2 },
    ],
    cvOutputs: [
      { source: { type: "disabled" } },
      { source: { type: "disabled" } },
      { source: { type: "disabled" } },
      { source: { type: "disabled" } },
    ],
    gateOutputs: [
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
      { source: { type: "disabled" }, duration: { mode: "global" } },
    ],
  };
}

describe("clonePatch", () => {
  test("returns an equal but independent copy", () => {
    const original = makePatch("original");
    const copy = clonePatch(original);

    expect(copy).toEqual(original);
    copy.name = "mutated";
    copy.cvOutputs[0].source = { type: "fixed", volts: 1 };
    expect(original.name).toBe("original");
    expect(original.cvOutputs[0].source.type).toBe("disabled");
  });
});

describe("patchesEqual", () => {
  test("identical patches are equal", () => {
    const a = makePatch("same");
    const b = clonePatch(a);
    expect(patchesEqual(a, b)).toBe(true);
  });

  test("patches with different names are not equal", () => {
    const a = makePatch("a");
    const b = makePatch("b");
    expect(patchesEqual(a, b)).toBe(false);
  });

  test("patches with a changed CV source are not equal", () => {
    const a = makePatch("a");
    const b = clonePatch(a);
    b.cvOutputs[1].source = { type: "fixed", volts: 3.3 };
    expect(patchesEqual(a, b)).toBe(false);
  });

  test("patches with a changed gate source are not equal", () => {
    const a = makePatch("a");
    const b = clonePatch(a);
    b.gateOutputs[7].source = { type: "transport-start" };
    expect(patchesEqual(a, b)).toBe(false);
  });

  test("patches with a changed gate duration are not equal", () => {
    const a = makePatch("a");
    const b = clonePatch(a);
    b.gateOutputs[3].duration = { mode: "trigger", durationMs: 50 };
    expect(patchesEqual(a, b)).toBe(false);
  });

  test("patches with a changed global setting are not equal", () => {
    const a = makePatch("a");
    const b = clonePatch(a);
    b.globals.defaultTriggerDurationMs = 25;
    expect(patchesEqual(a, b)).toBe(false);
  });
});
