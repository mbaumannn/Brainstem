# Brainstem

A modern, browser-based configurator for the
[Hexinverter Mutant Brain](https://www.hexinverter.net/mutant-brain/) —
a 16-output MIDI-to-CV Eurorack module.

Everything runs entirely client-side in your browser: no account, no backend,
no cloud service. Build a patch, preview it, and send it straight to your
module over Web MIDI — or export it as a `.syx` file and load it any other way.

![Brainstem](https://img.shields.io/badge/status-beta-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## What it does

The Mutant Brain turns MIDI into control voltages and gates: 4 CV outputs and
12 gate/trigger outputs, each freely mappable to notes, CCs, clocks, and more.
Configuring all of that by hand is tedious — Brainstem gives you a clear
visual editor for the job.

- **Visual CV and gate racks** — the page mirrors the module's front panel:
  four CV outputs (A–D) and twelve gate outputs (01–12), each clickable.
- **Contextual editors** — click an output to configure exactly what feeds it:
  source, MIDI channel, note ranges, CC number, clock divisions, and more.
- **Built-in starter profiles** — polyphonic voices, drum/trigger layouts, and
  other common configurations to begin from.
- **Advanced panel** — full control over globals and note inputs for the
  parameter-complete picture.
- **Send over Web MIDI** — push a patch to the module directly from the
  browser (requires a secure context and a Chromium-based browser).
- **Import / export** — read and write `.syx` files and a lossless JSON
  profile format; profiles also persist to your browser's local storage.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm test         # protocol round-trip + fixture tests (Vitest)
npm run build    # typecheck + production build
```

Web MIDI + SysEx sending requires a secure context (HTTPS, or `localhost` in
development) and a Chromium-based browser. Profile editing and `.syx` / JSON
import-export work everywhere.

## Architecture

```
src/
  protocol/   SysEx <-> typed MutantBrainPatch model. No UI imports here.
  profiles/   Built-in starter profiles, JSON profile format, localStorage.
  midi/       Web MIDI wrapper (navigator.requestMIDIAccess + output.send).
  components/ React UI — CV/Gate racks, contextual editors, Advanced panel.
  app/        Wiring: App.tsx, plain-language summaries, colors, file I/O.
```

The typed `MutantBrainPatch` (see `src/protocol/types.ts`) is the single
canonical configuration model. The Simple and Advanced views both read and
write the same state — there is no separate "advanced" data model. SysEx and
JSON profiles are both just serializations of it; JSON is what's stored in the
browser and shared, while SysEx is the format the hardware (and the `.syx`
fallback) uses.

## Protocol correctness

Mutant Brain patches are SysEx messages built from flat 4-byte NRPN-style
records — `[object][param][value-hi][value-lo]` — with no checksum or length
prefixing. The encode/decode layer in `src/protocol/` was verified against
**real captured `.syx` files** from an actual Mutant Brain device (in
`src/protocol/__tests__/fixtures/`), cross-checked against the shared-heritage
firmware source. Several subtle byte-level bugs (channel off-by-one, swapped
value-hi/value-lo fields, a never-applied trigger default) were found and fixed
this way; the fixture tests in `src/protocol/__tests__/` pin that behaviour so
it can't regress.

## Sources & credits

Brainstem is an independent, unofficial tool. It is **not** affiliated with or
endorsed by Hexinverter Électronique. The module itself, its SysEx protocol,
and the documentation referenced here are the work of Hexinverter and the open
source community — thanks to all of them.

- **Hexinverter — Mutant Brain product page** (specs, features, firmware
  updates): <https://www.hexinverter.net/mutant-brain/>
- **Hexinverter — Mutant Brain user manual (PDF)**: the authoritative
  reference for the module and its configuration protocol —
  <https://www.hexinverter.net/s/hexinverter_MUTANT-BRAIN_usermanual_v100.pdf>
- **Mutant Brain Surgery**: Hexinverter's own official SysEx patch builder,
  and the direct spiritual predecessor of this project —
  <http://mutantbrainsurgery.hexinverter.net/>
- **CV.OCD firmware (`hotchk155/cvocd.a`)**: the Mutant Brain and CV.OCD share
  the same NRPN-style SysEx configuration protocol, so this open source
  firmware was the primary source of truth for byte-level protocol facts
  (object IDs, param IDs, enum values) during development:
  <https://github.com/hotchk155/cvocd.a>

## License

Brainstem is released under the [MIT License](LICENSE). The reference CV.OCD
firmware it was validated against is licensed CC BY-NC-SA by its authors and
was used as documentation only — no firmware code is copied into this project.
