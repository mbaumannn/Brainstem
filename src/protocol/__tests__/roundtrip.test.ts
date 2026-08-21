import { describe, expect, it } from "vitest";
import { encodeSysex } from "../encode";
import { decodeSysex } from "../decode";
import { SYSEX_END, SYSEX_HEADER, SYSEX_START } from "../constants";
import { BUILTIN_PROFILES } from "../../profiles/defaults";
import { ProtocolError } from "../validation";

describe("SysEx round trip", () => {
  for (const profile of BUILTIN_PROFILES) {
    it(`encode -> decode -> encode is byte-identical for "${profile.name}"`, () => {
      const patch = profile.build();
      const bytes1 = encodeSysex(patch);
      expect(bytes1[0]).toBe(SYSEX_START);
      expect(bytes1[bytes1.length - 1]).toBe(SYSEX_END);
      expect(Array.from(bytes1.slice(1, 4))).toEqual(Array.from(SYSEX_HEADER));

      const decoded = decodeSysex(bytes1);
      const bytes2 = encodeSysex(decoded);

      expect(Array.from(bytes2)).toEqual(Array.from(bytes1));
    });
  }

  it("every byte in the message is a valid MIDI data byte (<128) except F0/F7 framing", () => {
    const bytes = encodeSysex(BUILTIN_PROFILES[1].build());
    for (let i = 1; i < bytes.length - 1; i++) {
      expect(bytes[i]).toBeLessThan(128);
    }
  });

  it("record body length is a multiple of 4", () => {
    const bytes = encodeSysex(BUILTIN_PROFILES[2].build());
    const bodyLength = bytes.length - 5; // minus F0, 3 header bytes, F7
    expect(bodyLength % 4).toBe(0);
  });

  it("rejects a non-Mutant-Brain sysex message with a readable error", () => {
    const bogus = new Uint8Array([0xf0, 0x00, 0x00, 0x0e, 0x01, 0x02, 0x03, 0x04, 0xf7]);
    expect(() => decodeSysex(bogus)).toThrow(ProtocolError);
    expect(() => decodeSysex(bogus)).toThrow(/not a Mutant Brain/i);
  });

  it("rejects a message with a malformed body length", () => {
    const malformed = new Uint8Array([0xf0, 0x00, 0x7f, 0x15, 0x01, 0x02, 0x03, 0xf7]);
    expect(() => decodeSysex(malformed)).toThrow(ProtocolError);
  });

  it("preserves unknown records losslessly through a decode/encode cycle", () => {
    const patch = BUILTIN_PROFILES[0].build();
    const bytes = encodeSysex(patch);
    // Splice in a well-formed but unrecognised record before the terminator.
    const withExtra = new Uint8Array(bytes.length + 4);
    withExtra.set(bytes.slice(0, bytes.length - 1));
    withExtra.set([0x7f, 0x01, 0x02, 0x03], bytes.length - 1);
    withExtra.set([0xf7], bytes.length + 3);

    const decoded = decodeSysex(withExtra);
    expect(decoded.unknownRecords).toContainEqual([0x7f, 0x01, 0x02, 0x03]);

    const reencoded = encodeSysex(decoded);
    // The unknown record's bytes must still be present in the re-exported file.
    const tail = Array.from(reencoded.slice(reencoded.length - 5, reencoded.length - 1));
    expect(tail).toEqual([0x7f, 0x01, 0x02, 0x03]);
  });
});

describe("CV pitch source mapping", () => {
  it("4 Mono Voices assigns CV A-D to note inputs 1-4 with matching channels", () => {
    const patch = BUILTIN_PROFILES.find((p) => p.id === "4-mono-voices")!.build();
    patch.cvOutputs.forEach((cv, i) => {
      expect(cv.source.type).toBe("pitch");
      if (cv.source.type === "pitch") {
        expect(cv.source.noteInput).toBe(i + 1);
      }
      expect(patch.noteInputs[i].channel).toEqual({ mode: "specific", channel: i + 1 });
    });
  });
});
