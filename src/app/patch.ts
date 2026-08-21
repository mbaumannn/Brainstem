import type { MutantBrainPatch } from "../protocol/types";

export function clonePatch(p: MutantBrainPatch): MutantBrainPatch {
  return JSON.parse(JSON.stringify(p));
}

export function patchesEqual(a: MutantBrainPatch, b: MutantBrainPatch): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
