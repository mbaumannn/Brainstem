import type { MutantBrainPatch } from "../protocol/types";
import type { StoredProfile } from "./schema";

const KEY = "brainstem.profiles.v1";

function readAll(): StoredProfile[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredProfile[];
  } catch {
    return [];
  }
}

function writeAll(profiles: StoredProfile[]) {
  localStorage.setItem(KEY, JSON.stringify(profiles));
}

export function listStoredProfiles(): StoredProfile[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveStoredProfile(id: string, patch: MutantBrainPatch): StoredProfile {
  const profiles = readAll();
  const existing = profiles.find((p) => p.id === id);
  const entry: StoredProfile = { id, name: patch.name, patch, updatedAt: Date.now() };
  if (existing) {
    Object.assign(existing, entry);
  } else {
    profiles.push(entry);
  }
  writeAll(profiles);
  return entry;
}

export function deleteStoredProfile(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function newProfileId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
