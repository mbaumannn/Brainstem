export const CHANNEL_COLORS = ["var(--ch-a)", "var(--ch-b)", "var(--ch-c)", "var(--ch-d)"];

export function channelColor(index: number): string {
  return CHANNEL_COLORS[index % CHANNEL_COLORS.length];
}
