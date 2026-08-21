# Brainstem

A browser-based configurator for the
[Hexinverter Mutant Brain](https://www.hexinverter.net/mutant-brain/), a
16-output MIDI-to-CV Eurorack module.

Everything runs in your browser. No account, no backend, no install. Build a
patch, send it to the module over Web MIDI, or export it as a `.syx` file and
load it however you like.

![Brainstem](https://img.shields.io/badge/status-beta-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## Why you'd use this

The Mutant Brain has 4 CV outputs and 12 gate/trigger outputs, each mappable
to notes, CCs, clocks, and more. On its own the only way to configure it is a
raw SysEx file, which is hard to read or edit by hand.

Brainstem makes it easy. You get a visual editor that mirrors the module's
front panel: click an output, pick what feeds it, and send the result straight
to the hardware. No other tool is needed. No web MIDI utility, no separate
editor, no terminal. Open the app, click, and play.

## What it does

- **Visual CV and gate racks.** The page mirrors the module's front panel:
  four CV outputs (A to D) and twelve gate outputs (01 to 12), each clickable.
- **Contextual editors.** Click an output to set its source, MIDI channel,
  note range, CC number, clock division, and more.
- **Built-in starter profiles.** Polyphonic voices, drum and trigger layouts,
  and other common setups to begin from.
- **Advanced panel.** Control over globals and note inputs for the full set of
  parameters.
- **Send over Web MIDI.** Push a patch to the module straight from the browser
  (needs a secure context and a Chromium-based browser).
- **Import and export.** Read and write `.syx` files and a JSON profile
  format. Profiles also save to your browser's local storage.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm test         # protocol round-trip + fixture tests (Vitest)
npm run build    # typecheck + production build
```

Web MIDI and SysEx sending need a secure context (HTTPS, or `localhost` in
development) and a Chromium-based browser. Profile editing and `.syx` / JSON
import-export work everywhere.

## Architecture

```
src/
  protocol/   SysEx <-> typed MutantBrainPatch model. No UI imports here.
  profiles/   Built-in starter profiles, JSON profile format, localStorage.
  midi/       Web MIDI wrapper (navigator.requestMIDIAccess + output.send).
  components/ React UI: CV/Gate racks, contextual editors, Advanced panel.
  app/        Wiring: App.tsx, plain-language summaries, colors, file I/O.
```

The typed `MutantBrainPatch` (see `src/protocol/types.ts`) is the one
configuration model the app uses. The Simple and Advanced views read and
write the same state; there is no separate advanced data model. SysEx and
JSON are both just ways of serializing it. JSON is what the browser stores
and shares. SysEx is the format the hardware uses (and what the `.syx` file
holds).

## Protocol correctness

Mutant Brain patches are SysEx messages built from flat 4-byte NRPN-style
records: `[object][param][value-hi][value-lo]`, with no checksum or length
prefix. The encode and decode layer in `src/protocol/` was checked against
real `.syx` files captured from an actual Mutant Brain device (in
`src/protocol/__tests__/fixtures/`) and cross-checked against the
shared-heritage firmware source. A few subtle byte-level bugs were found and
fixed this way (a channel off-by-one, swapped value-hi/value-lo fields, a
trigger default that was never applied). The fixture tests in
`src/protocol/__tests__/` lock that behavior down so it stays correct.

## Sources and credits

Brainstem is an independent, unofficial tool. It is **not** affiliated with
or endorsed by Hexinverter Électronique. The module, its SysEx protocol, and
the documentation referenced here are the work of Hexinverter and the open
source community. Thanks to all of them.

- **Hexinverter Mutant Brain product page** (specs, features, firmware
  updates): <https://www.hexinverter.net/mutant-brain/>
- **Hexinverter Mutant Brain user manual (PDF)**: the reference for the
  module and its configuration protocol:
  <https://www.hexinverter.net/s/hexinverter_MUTANT-BRAIN_usermanual_v100.pdf>
- **Mutant Brain Surgery**: Hexinverter's official SysEx patch builder and
  the direct predecessor of this project:
  <http://mutantbrainsurgery.hexinverter.net/>
- **CV.OCD firmware (`hotchk155/cvocd.a`)**: the Mutant Brain and CV.OCD
  share the same NRPN-style SysEx configuration protocol, so this open
  source firmware was the reference for byte-level protocol facts (object
  IDs, param IDs, enum values) during development:
  <https://github.com/hotchk155/cvocd.a>

## License

Brainstem is released under the [MIT License](LICENSE). The reference CV.OCD
firmware it was validated against is licensed CC BY-NC-SA by its authors and
was used as documentation only. No firmware code is copied into this project.
