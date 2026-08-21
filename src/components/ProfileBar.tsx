import { useState } from "react";
import { BUILTIN_PROFILES } from "../profiles/defaults";
import type { StoredProfile } from "../profiles/schema";

export function ProfileBar({
  activeName,
  activeBuiltinId,
  storedProfiles,
  onLoadBuiltin,
  onLoadStored,
  onNew,
  onDuplicate,
  onRename,
  onSave,
}: {
  activeName: string;
  activeBuiltinId: string | null;
  storedProfiles: StoredProfile[];
  onLoadBuiltin: (id: string) => void;
  onLoadStored: (id: string) => void;
  onNew: () => void;
  onDuplicate: () => void;
  onRename: (name: string) => void;
  onSave: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(activeName);

  const builtin = BUILTIN_PROFILES.find((p) => p.id === activeBuiltinId);

  return (
    <div className="profile-bar">
      <span className="profile-label">Profile</span>
      <select
        value={activeBuiltinId ? `builtin:${activeBuiltinId}` : "current"}
        onChange={(e) => {
          const v = e.target.value;
          if (v.startsWith("builtin:")) onLoadBuiltin(v.slice("builtin:".length));
          else if (v.startsWith("saved:")) onLoadStored(v.slice("saved:".length));
        }}
      >
        {!activeBuiltinId && <option value="current">{activeName} (unsaved)</option>}
        <optgroup label="Starter profiles">
          {BUILTIN_PROFILES.map((p) => (
            <option key={p.id} value={`builtin:${p.id}`}>
              {p.name}
            </option>
          ))}
        </optgroup>
        {storedProfiles.length > 0 && (
          <optgroup label="Saved profiles">
            {storedProfiles.map((p) => (
              <option key={p.id} value={`saved:${p.id}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {renaming ? (
        <input
          className="mono"
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => {
            onRename(draftName);
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRename(draftName);
              setRenaming(false);
            }
          }}
        />
      ) : (
        <button className="btn btn-ghost" onClick={() => { setDraftName(activeName); setRenaming(true); }}>
          Rename
        </button>
      )}
      <button className="btn btn-ghost" onClick={onNew}>
        New
      </button>
      <button className="btn btn-ghost" onClick={onDuplicate}>
        Duplicate
      </button>
      <button className="btn" onClick={onSave}>
        Save
      </button>

      <div className="spacer" />
      {builtin && <span className="profile-desc mono">{builtin.description}</span>}
    </div>
  );
}
