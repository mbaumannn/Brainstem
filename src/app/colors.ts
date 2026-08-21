export const CHANNEL_COLORS = ["var(--ch-a)", "var(--ch-b)", "var(--ch-c)", "var(--ch-d)"];

export function channelColor(index: number): string {
  return CHANNEL_COLORS[index % CHANNEL_COLORS.length];
}

const DIM_COLORS = [
  "var(--ch-a-dim)",
  "var(--ch-b-dim)",
  "var(--ch-c-dim)",
  "var(--ch-d-dim)",
];

export function channelColorDim(index: number): string {
  return DIM_COLORS[index % DIM_COLORS.length];
}

export function toneDim(tone: string): string {
  switch (tone) {
    case "var(--ch-a)":
      return "var(--ch-a-dim)";
    case "var(--ch-b)":
      return "var(--ch-b-dim)";
    case "var(--ch-c)":
      return "var(--ch-c-dim)";
    case "var(--ch-d)":
      return "var(--ch-d-dim)";
    case "var(--accent)":
      return "var(--ch-a-dim)";
    default:
      return "var(--ch-neutral-dim)";
  }
}
