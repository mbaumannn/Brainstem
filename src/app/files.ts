import { encodeSysex } from "../protocol/encode";
import { decodeSysex } from "../protocol/decode";
import type { MutantBrainPatch } from "../protocol/types";
import { fromProfileFile, toProfileFile } from "../profiles/schema";

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "patch";
}

function download(data: Uint8Array | string, filename: string, type: string) {
  const blob = new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSysex(patch: MutantBrainPatch) {
  const bytes = encodeSysex(patch);
  download(bytes, `${slug(patch.name)}.syx`, "application/octet-stream");
}

export function downloadProfileJson(patch: MutantBrainPatch) {
  const json = JSON.stringify(toProfileFile(patch), null, 2);
  download(json, `${slug(patch.name)}.json`, "application/json");
}

export async function readPatchFromFile(file: File): Promise<MutantBrainPatch> {
  if (file.name.endsWith(".syx")) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const patch = decodeSysex(buf);
    patch.name = file.name.replace(/\.syx$/i, "");
    return patch;
  }
  const text = await file.text();
  const json = JSON.parse(text);
  return fromProfileFile(json);
}
