import { describe, expect, it } from "vitest";
import { shortGateLabel } from "./summarize";
import type { GateOutputSettings } from "../protocol/types";

function gate(source: GateOutputSettings["source"], duration: GateOutputSettings["duration"]): GateOutputSettings {
  return { source, duration };
}

describe("shortGateLabel", () => {
  it("labels note-gate sources as Voice gate", () => {
    expect(shortGateLabel(gate({ type: "note-gate", noteInput: 1 }, { mode: "gate" }))).toBe("Voice gate");
  });

  it("labels transport sources as Transport", () => {
    expect(shortGateLabel(gate({ type: "transport-start" }, { mode: "gate" }))).toBe("Transport");
    expect(shortGateLabel(gate({ type: "transport-run" }, { mode: "gate" }))).toBe("Transport");
  });

  it("labels disabled sources as Disabled", () => {
    expect(shortGateLabel(gate({ type: "disabled" }, { mode: "gate" }))).toBe("Disabled");
  });

  it("labels duration-capable sources by their behavior mode", () => {
    const midi = { type: "midi-note" as const, channel: { mode: "specific" as const, channel: 10 }, note: 60 };
    expect(shortGateLabel(gate(midi, { mode: "gate" }))).toBe("Gate");
    expect(shortGateLabel(gate(midi, { mode: "trigger", durationMs: 10 }))).toBe("Trigger");
    expect(shortGateLabel(gate(midi, { mode: "retrigger", durationMs: 10 }))).toBe("Retrigger");
    expect(shortGateLabel(gate(midi, { mode: "global" }))).toBe("Global");

    const clock = { type: "clock" as const, division: "1/16" as const };
    expect(shortGateLabel(gate(clock, { mode: "gate" }))).toBe("Gate");
    expect(shortGateLabel(gate(clock, { mode: "trigger", durationMs: 5 }))).toBe("Trigger");

    const cc = { type: "cc-above" as const, channel: { mode: "specific" as const, channel: 1 }, cc: 1, threshold: 64 };
    expect(shortGateLabel(gate(cc, { mode: "gate" }))).toBe("Gate");
    expect(shortGateLabel(gate(cc, { mode: "trigger", durationMs: 10 }))).toBe("Trigger");
  });
});
