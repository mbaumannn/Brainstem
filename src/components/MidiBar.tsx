import { useEffect, useState } from "react";
import { isWebMidiSupported, listMidiOutputs, sendSysex, type MidiOutputInfo } from "../midi/webMidi";
import { describeError } from "../protocol/validation";

type Status = { kind: "idle" | "busy" | "ok" | "err"; message: string };

export function MidiBar({ getSysexBytes }: { getSysexBytes: () => Uint8Array }) {
  const supported = isWebMidiSupported();
  const [outputs, setOutputs] = useState<MidiOutputInfo[]>([]);
  const [outputId, setOutputId] = useState<string>("");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: supported ? "Not connected" : "Web MIDI unavailable" });
  const [requested, setRequested] = useState(false);

  async function connect() {
    setRequested(true);
    try {
      const list = await listMidiOutputs();
      setOutputs(list);
      if (list.length > 0) {
        setOutputId((prev) => prev || list[0].id);
        setStatus({ kind: "ok", message: "Ready" });
      } else {
        setStatus({ kind: "idle", message: "No MIDI outputs found" });
      }
    } catch (err) {
      setStatus({ kind: "err", message: describeError(err) });
    }
  }

  useEffect(() => {
    if (supported) connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    if (!outputId) return;
    setStatus({ kind: "busy", message: "Sending…" });
    try {
      await sendSysex(outputId, getSysexBytes());
      setStatus({ kind: "ok", message: "Sent — check the Mutant Brain's top LEDs for the flash" });
    } catch (err) {
      setStatus({ kind: "err", message: describeError(err) });
    }
  }

  return (
    <div className="midi-bar">
      <div className="midi-bar-inner">
        <div className="midi-select-group">
          <span className="profile-label mono">MIDI Output</span>
          {supported ? (
            <select value={outputId} onChange={(e) => setOutputId(e.target.value)} onFocus={() => !requested && connect()}>
              {outputs.length === 0 && <option value="">No outputs found</option>}
              {outputs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="midi-status-text">Use Download .syx instead</span>
          )}
        </div>

        <span className="midi-status-text">
          <span className={`status-dot ${status.kind === "idle" ? "" : status.kind}`} />
          {status.message}
        </span>

        <div className="spacer" />

        <button className="btn btn-primary" disabled={!supported || !outputId || status.kind === "busy"} onClick={handleSend}>
          Send to Mutant Brain
        </button>

        <span className="midi-note">Pause other MIDI traffic while sending.</span>
      </div>
    </div>
  );
}
