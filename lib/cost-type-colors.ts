export const DEFAULT_COST_TYPE_COLORS = [
  "#059669",
  "#0891b2",
  "#6366f1",
  "#db2777",
  "#d97706",
  "#7c3aed",
];

export function pickDefaultColor(index: number): string {
  return DEFAULT_COST_TYPE_COLORS[index % DEFAULT_COST_TYPE_COLORS.length];
}
