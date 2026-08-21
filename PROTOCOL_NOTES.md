# Protocol findings

This log records what was actually verified while building the SysEx layer,
what in the original brief was confirmed, and what remains open.

## Environment constraints hit during research

The task description references three "supplied" files (the Mutant Brain
user manual PDF, a real captured `.syx` fixture, and the `hotchk155/cvocd.a`
/ `noriah/reveng-mutantbrain` repositories) as being available in the
project. **None of these were actually present in this environment** — the
working directory was empty, and this session's outbound access is limited
to an HTTPS proxy plus a GitHub connector scoped only to this repo. `git
clone` / `codeload.github.com` tarballs were blocked by the proxy, and the
GitHub search/code tools are explicitly out of scope for repos outside this
one. `raw.githubusercontent.com` fetches worked, but only once the correct
repo name was found — the manual, the reverse-engineering repo, and the real
`.syx` fixture could not be located or fetched at all.

**Net effect: the protocol layer below is derived entirely from the
CV.OCD firmware headers (`hotchk155/cvocd.a`, fetched via
`raw.githubusercontent.com`) and the SysEx header shape given in the task
prompt — not from a real Mutant Brain fixture or the vendor manual.** This
is the single most important caveat for anyone continuing this project:
**the "byte-for-byte identical to a real file" milestone (spec item 16) is
not yet met**, because there was no real file to test against. What's
implemented is a well-documented, internally-consistent, round-trip-safe
encoder/decoder built on verified low-level protocol facts, with an explicit
list below of which specific bytes are still assumptions rather than
verified facts.

## What was verified from primary source (`hotchk155/cvocd.a`)

Fetched and read directly (not paraphrased) from
`firmware/cvocd.h` and `firmware/cvocd.c`:

- SysEx ID bytes: `MY_SYSEX_ID0/1/2 = 0x00 0x7f 0x15` — matches the task's
  `F0 00 7F 15` header exactly.
- The device parses SysEx as flat 4-byte records:
  `SYSEX_PARAMH → SYSEX_PARAML → SYSEX_VALUEH → SYSEX_VALUEL`, then calls
  `nrpn(nrpn_hi, nrpn_lo, nrpn_value_hi, ch)` — i.e. **no checksum, no
  length-prefixing, no escaping**. This matches the task's
  `[object][param][value-hi][value-lo]` record description exactly.
- Object ("NRPN high byte") constants: `NRPNH_GLOBAL=1`,
  `NRPNH_STACK1..4=11..14 (0x0B–0x0E)`, `NRPNH_CV1..4=21..24 (0x15–0x18)`,
  `NRPNH_GATE1..12=31..42 (0x1F–0x2A)`. This is an **exact match** to the
  object ranges given in the task prompt (Globals=01, Note Inputs=0B–0E,
  CV=15–18, Gates=1F–2A) — strong cross-confirmation that Mutant Brain and
  CV.OCD share this record layout, as the brief claimed.
- Param ("NRPN low byte") constants: `SRC=1, CHAN=2, NOTE_MIN=3 (aliased as
  NOTE), NOTE_MAX=4, VEL_MIN=5, PB_RANGE=7, PRIORITY=8, TICK_OFS=11,
  GATE_DUR=12, THRESHOLD=13, TRANSPOSE=14, VOLTS=15, PITCH_SCHEME=16,
  CAL_SCALE=98, CAL_OFS=99, SAVE=100`.
- Source-type enum (`NRPVH_SRC_*`): disable=0, MIDI note=1, MIDI CC=2, MIDI
  CC (negative/below-threshold)=3, pitch bend=4, aftertouch=5, note-stacks
  1–4=11–14, MIDI tick=20, MIDI tick-while-running=21, MIDI run=22, MIDI
  start=23, MIDI stop=25, MIDI start/stop=26, test voltage=127.
- Note-priority enum (`PRIORITY_*`): last=0, low=1, high=3, cycle-2/3/4=
  6/7/8, chord-2/3/4=9/10/11, paraphonic=12, paraphonic-release=13.
  (Values 2, 4, 5 are gaps in the firmware's own enum — not used.)
- Pitch scheme enum: V/Oct=0, Hz/V=1, 12V/Oct=2.
- Gate duration mode enum (`NRPVH_DUR_*`): infinite=0, milliseconds=1,
  global=2, retrigger=3.
- Channel selector special values used elsewhere in firmware:
  `CHAN_OMNI=0x80`, `CHAN_GLOBAL=0x81`, `CHAN_DISABLE=0xFF` (these are the
  *in-RAM* representation; see the open assumption below about how this
  maps onto the 2-byte NRPN wire value for the CHAN param, which the
  fetched source did not show directly).
- Default values (`DEFAULT_*`): gate note=60, gate CC=1, gate CC
  threshold=64, gate clock division=6 (ticks), gate trigger duration=10ms,
  accent velocity=127, MIDI channel=0 (i.e. channel 1), CV max volts=5.
- MIDI clock is tracked as 24 ticks per quarter note
  (`if (++midi_ticks >= 24) midi_ticks = 0;`), confirming clock divisions
  are stored as **raw tick counts**, not a lookup-table index. Combined
  with `DEFAULT_GATE_DIV = 6`, this fixes 6 ticks = 1/16 note as the
  device's own default — the ratios used in `constants.ts`
  (`CLOCK_DIVISION_TICKS`) follow directly from that (24 PPQN=1 tick,
  1/32=3, 1/16=6, 1/8=12, 1/4=24, 1/2=48, 1/1=96).
- Gate source constants in `firmware/gate.c` / `gate.h` confirm gate
  sources reuse the same `NRPVH_SRC_*` values as CV sources (gate-specific
  extras like `GATE_NOTE_GATEA..D` exist for the in-RAM event-bus wiring,
  not the wire protocol).

## Explicit assumptions (not directly verified — flagged in code comments)

These are implementation choices made to produce a complete, internally
consistent protocol given the gaps above. They are isolated to
`src/protocol/encode.ts` / `decode.ts` and documented inline:

1. **Note-input enable flag.** The fetched header doesn't show how a note
   input's on/off state is written over SysEx. We encode it as the SRC
   param's value-hi byte (1 = enabled, 0 = disabled) for the `NOTE_INPUT_n`
   object. This is a reasonable, self-consistent choice, not a confirmed
   wire value.
2. **CHAN param wire encoding.** We encode channel selection as
   value-hi = 0/1/2 for specific/omni/global, value-lo = zero-based channel
   number when specific. The firmware's `CHAN_OMNI/CHAN_GLOBAL/CHAN_DISABLE`
   constants (0x80/0x81/0xFF) are for the in-RAM channel byte, which may or
   may not be what's written directly as the NRPN value-hi over the wire —
   this needs verification against a real fixture.
3. **CC number storage.** CV/Gate "MIDI CC" sources store the CC number in
   the SRC param's value-lo byte (alongside SRC value-hi = the CC source
   type). The header aliases `NRPNL_NOTE_MIN` as `NRPNL_NOTE`, suggesting
   the same param slot is reused for "the note/CC number" depending on
   source type — but this wasn't confirmed against `cv.c`/`gate.c` logic
   directly.
4. **Gate "note-gate" / note-input event selection.** We map `note-gate`
   sources to the same `STACK_1..4` SRC values used for CV pitch, since
   `gate.h`'s `GATE_NOTE_GATEA..D` names strongly suggest a per-stack gate
   event, but the exact SRC/value-lo pairing wasn't in the fetched excerpt.

None of these assumptions affect internal correctness — `encodeSysex` and
`decodeSysex` are mutually consistent and round-trip exactly (see Testing
below) — but a byte-for-byte match against a real device dump has **not**
been established and should be the very next validation step once a real
`.syx` file or the vendor manual is available.

## What the task prompt got right vs. wrong

- **Confirmed:** message framing `F0 00 7F 15 ... F7`, 4-byte flat records,
  no checksum/compression, and the exact object ID ranges for
  Globals/NoteInputs/CV/Gates.
- **Not verifiable in this environment:** the specific byte counts quoted
  for the supplied fixture (329 bytes / 81 records) — no such file was
  available to check against.
- **Unconfirmed / our own design choice:** the precise value-hi/value-lo
  packing for CHAN, CC number, and note-input enable, as listed above.

## Testing

`npm test` runs `src/protocol/__tests__/roundtrip.test.ts` (Vitest), which:

- Encodes every built-in profile to SysEx bytes, decodes them back, and
  re-encodes — asserting **byte-for-byte identical output** on the second
  pass. This is the strongest test possible without a real fixture: it
  proves the encoder and decoder agree with each other and that no
  information is lost or reordered.
- Checks message framing (`F0`/`F7`, header bytes, 4-byte record alignment,
  all interior bytes < 128 as required for valid MIDI data bytes).
- Checks that malformed/foreign SysEx is rejected with a human-readable
  `ProtocolError`, not a raw exception.
- Checks that unrecognised (object, param) records surviving an import are
  preserved losslessly through a decode → encode cycle (see "Unknown record
  preservation" below).

All 12 tests pass as of this writing. **The one milestone still open is
validating against a real captured `.syx` file** — see "Next steps".

## Unknown record preservation

Per spec item 15, decode preserves unrecognised records losslessly
(`MutantBrainPatch.unknownRecords`) rather than dropping them: any SysEx
object ID outside the known Global/NoteInput/CV/Gate ranges, or any known
object with a param ID this app doesn't model (e.g. `CAL_SCALE`,
`CAL_OFS`, `SAVE`), is carried through unchanged and re-emitted verbatim on
export.

## Next steps

1. Obtain a real Mutant Brain `.syx` capture (from a real device, the
   vendor's configurator, or the vendor manual's appendix) and add it as a
   fixture test — this is the actual byte-for-byte milestone from spec
   item 16/26.
2. Cross-check the four explicit assumptions above against that fixture or
   against `cv.c`/`gate.c` (not just the headers) once reachable.
3. If findings differ from the assumptions, they're isolated to
   `encode.ts`/`decode.ts` — the typed `MutantBrainPatch` model and all UI
   code are protocol-agnostic and won't need to change.
