# Brainstem

A modern, browser-based configurator for the Hexinverter Mutant Brain
MIDI-to-CV module. Everything runs client-side: no account, backend, or
cloud service.

Spiritual successor to
[Mutant Brain Surgery](http://mutantbrainsurgery.hexinverter.net/), with
product/interaction inspiration from
[Plaits Palette](https://rubato.audio/plaits-palette/) — but with its own
visual identity (warm dark ink, module-coded accent colors, signal-path
motifs, no visual cloning).

## Status

Milestone 1 (protocol) and Milestone 2 (functional editor) are implemented,
along with Milestone 3 (Web MIDI send). See `PROTOCOL_NOTES.md` for exactly
what was verified against source vs. assumed, and what's still open before
this can be trusted against real hardware.

## Getting started

```bash
npm install
npm run dev      # start the app
npm test         # protocol round-trip tests (Vitest)
npm run build    # typecheck + production build
```

Web MIDI + SysEx sending requires a secure context (HTTPS, or localhost in
dev) and a Chromium-based browser. Profile editing and `.syx`/JSON
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
write the same state — there is no separate "advanced" data model. SysEx
and JSON profiles are both just serializations of it; JSON is what's stored
in the browser and shared, SysEx is only for the device/`.syx` fallback.

## Protocol source

Built against `hotchk155/cvocd.a` (CV.OCD firmware, which shares the Mutant
Brain's SysEx heritage) as the closest verifiable primary source reachable
from this environment — see `PROTOCOL_NOTES.md` for the full findings log,
including which specific fields are confirmed vs. still assumptions pending
a real device fixture.
