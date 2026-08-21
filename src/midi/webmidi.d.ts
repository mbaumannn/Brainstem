// Minimal Web MIDI API ambient types (not included in TS's default DOM lib).

interface MIDIOptions {
  sysex?: boolean;
  software?: boolean;
}

interface MIDIPort extends EventTarget {
  id: string;
  manufacturer?: string;
  name?: string;
  type: "input" | "output";
  version?: string;
  state: "connected" | "disconnected";
  connection: "open" | "closed" | "pending";
  onstatechange: ((this: MIDIPort, ev: Event) => any) | null;
  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
}

interface MIDIOutput extends MIDIPort {
  type: "output";
  send(data: number[] | Uint8Array, timestamp?: number): void;
  clear(): void;
}

interface MIDIInput extends MIDIPort {
  type: "input";
  onmidimessage: ((this: MIDIInput, ev: MessageEvent<Uint8Array>) => any) | null;
}

interface MIDIInputMap {
  forEach(callback: (value: MIDIInput, key: string, map: MIDIInputMap) => void): void;
  get(id: string): MIDIInput | undefined;
  values(): IterableIterator<MIDIInput>;
  keys(): IterableIterator<string>;
  size: number;
}

interface MIDIOutputMap {
  forEach(callback: (value: MIDIOutput, key: string, map: MIDIOutputMap) => void): void;
  get(id: string): MIDIOutput | undefined;
  values(): IterableIterator<MIDIOutput>;
  keys(): IterableIterator<string>;
  size: number;
}

interface MIDIAccess extends EventTarget {
  inputs: MIDIInputMap;
  outputs: MIDIOutputMap;
  sysexEnabled: boolean;
  onstatechange: ((this: MIDIAccess, ev: Event) => any) | null;
}

interface Navigator {
  requestMIDIAccess(options?: MIDIOptions): Promise<MIDIAccess>;
}
