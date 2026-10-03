import { useMemo, useRef, useState } from "react";
import "./index.css";
import { BUILTIN_PROFILES } from "./profiles/defaults";
import { listStoredProfiles, newProfileId, saveStoredProfile } from "./profiles/storage";
import type { MutantBrainPatch } from "./protocol/types";
import { encodeSysex } from "./protocol/encode";
import { describeError } from "./protocol/validation";
import { downloadProfileJson, downloadSysex, readPatchFromFile } from "./app/files";
import { clonePatch, patchesEqual } from "./app/patch";
import { CvRack } from "./components/CvRack";
import { CvEditor } from "./components/CvEditor";
import { GateGrid } from "./components/GateGrid";
import { GateEditor } from "./components/GateEditor";
import { AdvancedPanel } from "./components/AdvancedPanel";
import { ProfileBar } from "./components/ProfileBar";
import { MidiBar } from "./components/MidiBar";
import { ChannelRing } from "./components/ChannelRing";
import { ZigzagMark } from "./components/ZigzagMark";

export default function App() {
  const [patch, setPatch] = useState<MutantBrainPatch>(() => BUILTIN_PROFILES[1].build());
  const [loadedPatchSnapshot, setLoadedPatchSnapshot] = useState<MutantBrainPatch>(() => clonePatch(BUILTIN_PROFILES[1].build()));
  const [activeBuiltinId, setActiveBuiltinId] = useState<string | null>("4-mono-voices");
  const [activeStoredId, setActiveStoredId] = useState<string | null>(null);
  const [storedProfiles, setStoredProfiles] = useState(() => listStoredProfiles());

  const isModified = !patchesEqual(patch, loadedPatchSnapshot);
  const saveMode: "new" | "update" = activeStoredId ? "update" : "new";

  const [selectedCv, setSelectedCv] = useState<number | null>(null);
  const [selectedGate, setSelectedGate] = useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sysexBytes = useMemo(() => {
    try {
      return encodeSysex(patch);
    } catch {
      return new Uint8Array();
    }
  }, [patch]);

  function loadBuiltin(id: string) {
    const b = BUILTIN_PROFILES.find((p) => p.id === id);
    if (!b) return;
    const loaded = b.build();
    setPatch(loaded);
    setLoadedPatchSnapshot(clonePatch(loaded));
    setActiveBuiltinId(id);
    setActiveStoredId(null);
    setSelectedCv(null);
    setSelectedGate(null);
  }

  function loadStored(id: string) {
    const s = storedProfiles.find((p) => p.id === id);
    if (!s) return;
    const loaded = clonePatch(s.patch);
    setPatch(loaded);
    setLoadedPatchSnapshot(loaded);
    setActiveBuiltinId(null);
    setActiveStoredId(id);
    setSelectedCv(null);
    setSelectedGate(null);
  }

  function handleSave() {
    const id = activeStoredId ?? newProfileId();
    saveStoredProfile(id, patch);
    setStoredProfiles(listStoredProfiles());
    setLoadedPatchSnapshot(clonePatch(patch));
    setActiveStoredId(id);
    setActiveBuiltinId(null);
  }

  function handleNew() {
    const p = BUILTIN_PROFILES[0].build();
    p.name = "New profile";
    setPatch(p);
    setLoadedPatchSnapshot(clonePatch(p));
    setActiveBuiltinId(null);
    setActiveStoredId(null);
  }

  function handleDuplicate() {
    const p = clonePatch(patch);
    p.name = `${p.name} copy`;
    setPatch(p);
    setLoadedPatchSnapshot(clonePatch(p));
    setActiveBuiltinId(null);
    setActiveStoredId(null);
  }

  function handleRename(name: string) {
    setPatch({ ...patch, name });
  }

  function handleRevert() {
    setPatch(clonePatch(loadedPatchSnapshot));
  }

  async function handleImport(file: File) {
    try {
      const imported = await readPatchFromFile(file);
      setPatch(imported);
      setLoadedPatchSnapshot(clonePatch(imported));
      setActiveBuiltinId(null);
      setActiveStoredId(null);
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="wordmark">
          <h2>
            <ChannelRing tone="var(--accent)" active size={22} />
            <span>Brainstem</span>
          </h2>
          <span className="wordmark-tagline">a Mutant Brain utility</span>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".syx,.json"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <button className="btn" onClick={() => downloadSysex(patch)}>
            Export .syx
          </button>
          <button className="btn" onClick={() => downloadProfileJson(patch)}>
            Export JSON
          </button>
          <button className={`btn ${advancedOpen ? "btn-primary" : ""}`} onClick={() => setAdvancedOpen((v) => !v)}>
            Advanced
          </button>
        </div>
      </header>

      {error && (
        <div className="editor-drawer" style={{ borderColor: "var(--danger)", color: "var(--danger)", marginBottom: 20 }}>
          {error}
          <button className="text-btn" style={{ marginLeft: 12 }} onClick={() => setError(null)}>
            dismiss
          </button>
        </div>
      )}

      <ProfileBar
        activeName={patch.name}
        activeBuiltinId={activeBuiltinId}
        storedProfiles={storedProfiles}
        isModified={isModified}
        saveMode={saveMode}
        onLoadBuiltin={loadBuiltin}
        onLoadStored={loadStored}
        onNew={handleNew}
        onDuplicate={handleDuplicate}
        onRename={handleRename}
        onSave={handleSave}
        onRevert={handleRevert}
      />

      <CvRack patch={patch} selected={selectedCv} onSelect={setSelectedCv} />
      {selectedCv !== null && (
        <CvEditor
          index={selectedCv}
          patch={patch}
          onChange={(cv) => {
            const cvOutputs = [...patch.cvOutputs] as MutantBrainPatch["cvOutputs"];
            cvOutputs[selectedCv] = cv;
            setPatch({ ...patch, cvOutputs });
          }}
          onClose={() => setSelectedCv(null)}
        />
      )}

      <GateGrid patch={patch} selected={selectedGate} onSelect={setSelectedGate} />
      {selectedGate !== null && (
        <GateEditor
          index={selectedGate}
          patch={patch}
          onChange={(g) => {
            const gateOutputs = [...patch.gateOutputs] as MutantBrainPatch["gateOutputs"];
            gateOutputs[selectedGate] = g;
            setPatch({ ...patch, gateOutputs });
          }}
          onClose={() => setSelectedGate(null)}
        />
      )}

      {advancedOpen && <AdvancedPanel patch={patch} onChange={setPatch} />}

      <ZigzagMark />
      <MidiBar getSysexBytes={() => sysexBytes} />
    </>
  );
}
