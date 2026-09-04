"use client";

import { useTheme } from "next-themes";

/**
 * Chart colours, selected per mode rather than flipped automatically.
 *
 * `series1`/`series2` are the first two slots of the validated categorical
 * palette (blue, orange): worst adjacent CVD ΔE 24.7 light / 26.8 dark, well
 * clear of the ≥8 target. Magnitude charts use one hue only — colouring bars
 * by their own value would double-encode length as hue.
 *
 * Status colours come from the same map the badges use, so a status means one
 * colour everywhere. That trio sits in the 6–8 CVD band (emerald↔amber ΔE 7.9),
 * which is why every chart using it also carries a legend, 2px surface gaps
 * between segments, and value labels — colour is never the only channel.
 */
export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return {
    dark,
    surface: dark ? "#0a0a0a" : "#ffffff",
    grid: dark ? "#27272a" : "#e5e5e5",
    axis: dark ? "#a1a1aa" : "#71717a",
    text: dark ? "#fafafa" : "#0a0a0a",
    series1: dark ? "#3987e5" : "#2a78d6",
    series2: dark ? "#d95926" : "#eb6834",
    status: {
      SUBMITTED: dark ? "#3987e5" : "#2563eb",
      NEEDS_CORRECTION: dark ? "#e0a02a" : "#d97706",
      APPROVED: dark ? "#10a37f" : "#059669",
    },
  };
}

export type ChartColors = ReturnType<typeof useChartColors>;
