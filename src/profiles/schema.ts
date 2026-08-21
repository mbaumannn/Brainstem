import type { MutantBrainPatch } from "../protocol/types";

export const PROFILE_FORMAT = "mutant-lab-profile";
export const PROFILE_FORMAT_VERSION = 1;

/** Versioned, human-readable JSON profile format. This — not raw SysEx — is canonical. */
export interface ProfileFile {
  format: typeof PROFILE_FORMAT;
  version: typeof PROFILE_FORMAT_VERSION;
  name: string;
  patch: MutantBrainPatch;
}

export interface StoredProfile {
  id: string;
  name: string;
  patch: MutantBrainPatch;
  updatedAt: number;
}

export function toProfileFile(patch: MutantBrainPatch): ProfileFile {
  return { format: PROFILE_FORMAT, version: PROFILE_FORMAT_VERSION, name: patch.name, patch };
}

export function fromProfileFile(json: unknown): MutantBrainPatch {
  if (
    typeof json !== "object" ||
    json === null ||
    (json as any).format !== PROFILE_FORMAT ||
    typeof (json as any).patch !== "object"
  ) {
    throw new Error("This file is not a recognised Brainstem profile.");
  }
  const file = json as ProfileFile;
  return file.patch;
}
