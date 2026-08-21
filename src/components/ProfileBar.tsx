import { useState } from "react";
import { BUILTIN_PROFILES } from "../profiles/defaults";
import type { StoredProfile } from "../profiles/schema";

export function ProfileBar({
  activeName,
  activeBuiltinId,
  storedProfiles,
  isModified,
  saveMode,
  onLoadBuiltin,
  onLoadStored,
  onNew,
  onDuplicate,
  onRename,
  onSave,
  onRevert,
}: {
  activeName: string;
  activeBuiltinId: string | null;
  storedProfiles: StoredProfile[];
  isModified: boolean;
  saveMode: "new" | "update";
  onLoadBuiltin: (id: string) => void;
  onLoadStored: (id: string) => void;
  onNew: () => void;
  onDuplicate: () => void;
  onRename: (name: string) => void;
  onSave: () => void;
  onRevert: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(activeName);

  const builtin = BUILTIN_PROFILES.find((p) => p.id === activeBuiltinId);

  return (
    <div className="profile-bar">
      <div className="profile-header">
        {renaming ? (
          <input
            className="profile-name-input"
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
          <>
            <h2 className="profile-name">{activeName}</h2>
            {isModified && (
              <>
                <span className="profile-status">Modified</span>
                <button className="profile-revert" onClick={onRevert}>
                  Revert
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div className="profile-controls">
        <select
          value="switch"
          onChange={(e) => {
            const v = e.target.value;
            if (v.startsWith("builtin:")) onLoadBuiltin(v.slice("builtin:".length));
            else if (v.startsWith("saved:")) onLoadStored(v.slice("saved:".length));
          }}
        >
          <option value="switch" disabled>
            Switch profile…
          </option>
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

        <button
          className="btn btn-ghost"
          onClick={() => {
            setDraftName(activeName);
            setRenaming(true);
          }}
        >
          Rename
        </button>
        <button className="btn btn-ghost" onClick={onNew}>
          New
        </button>
        <button className="btn btn-ghost" onClick={onDuplicate}>
          Duplicate
        </button>
        <button
          className="btn"
          onClick={onSave}
          title={saveMode === "new" ? "Save as a new stored profile" : "Update the stored profile"}
        >
          {saveMode === "new" ? "Save as new" : "Save"}
        </button>
      </div>

      {builtin && <p className="profile-desc mono">{builtin.description}</p>}
    </div>
  );
}
