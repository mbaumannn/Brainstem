export interface MidiOutputInfo {
  id: string;
  name: string;
}

export function isWebMidiSupported(): boolean {
  return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
}

let accessPromise: Promise<MIDIAccess> | null = null;

async function getAccess(): Promise<MIDIAccess> {
  if (!isWebMidiSupported()) {
    throw new Error("Web MIDI is not available in this browser.");
  }
  if (!accessPromise) {
    accessPromise = navigator.requestMIDIAccess({ sysex: true }).catch((err) => {
      accessPromise = null;
      if (err instanceof Error && /sysex|permission/i.test(err.message)) {
        throw new Error("SysEx permission was not granted.");
      }
      throw new Error("Web MIDI access was denied.");
    });
  }
  return accessPromise;
}

export async function listMidiOutputs(): Promise<MidiOutputInfo[]> {
  const access = await getAccess();
  return Array.from(access.outputs.values()).map((o) => ({
    id: o.id,
    name: o.name ?? "Unnamed MIDI output",
  }));
}

export function watchMidiOutputs(onChange: (outputs: MidiOutputInfo[]) => void): () => void {
  let cancelled = false;
  getAccess()
    .then((access) => {
      const refresh = () => {
        if (cancelled) return;
        onChange(Array.from(access.outputs.values()).map((o) => ({ id: o.id, name: o.name ?? "Unnamed MIDI output" })));
      };
      access.addEventListener("statechange", refresh);
      refresh();
    })
    .catch(() => {
      /* surfaced via listMidiOutputs()/sendSysex() call sites */
    });
  return () => {
    cancelled = true;
  };
}

export async function sendSysex(outputId: string, bytes: Uint8Array): Promise<void> {
  const access = await getAccess();
  const output = access.outputs.get(outputId);
  if (!output) {
    throw new Error("The selected MIDI output disappeared.");
  }
  if (output.state === "disconnected") {
    throw new Error("The selected MIDI output disappeared.");
  }
  output.send(bytes);
}
