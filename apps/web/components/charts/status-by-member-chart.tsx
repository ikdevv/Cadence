"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { StatusByMemberRow } from "@cadence/shared"
import {
  ChartFrame,
  SimpleTable,
  tooltipStyles,
} from "@/components/charts/chart-frame"
import { useChartColors } from "@/lib/chart-theme"

/**
 * Part-to-whole per member, so the bars are horizontal — member names do not fit
 * under vertical columns. Segments carry the same status colours as the badges;
 * the 2px surface-coloured separation and the legend are what keep the amber and
 * emerald segments distinguishable for colour-vision-deficient readers.
 */
export function StatusByMemberChart({
  data,
  isLoading,
}: {
  data: StatusByMemberRow[] | undefined
  isLoading: boolean
}) {
  const colors = useChartColors()
  const rows = data ?? []
  const isEmpty =
    rows.length === 0 ||
    rows.every(
      (row) => row.SUBMITTED + row.NEEDS_CORRECTION + row.APPROVED === 0,
    )

  return (
    <ChartFrame
      title="Reports by status, per member"
      description="Drafts are private to their owner and never counted here."
      isLoading={isLoading}
      isEmpty={isEmpty}
      table={
        <SimpleTable
          head={["Member", "Approved", "Awaiting review", "In correction"]}
          rows={rows.map((row) => [
            row.name,
            row.APPROVED,
            row.SUBMITTED,
            row.NEEDS_CORRECTION,
          ])}
        />
      }
    >
      <ResponsiveContainer width="100%" height={Math.max(rows.length * 44, 220)}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
          barCategoryGap={12}
        >
          <CartesianGrid stroke={colors.grid} strokeWidth={1} horizontal={false} />
          <XAxis
            type="number"
            stroke={colors.axis}
            tickLine={false}
            allowDecimals={false}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            stroke={colors.axis}
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <Tooltip {...tooltipStyles(colors)} cursor={{ fill: colors.grid, opacity: 0.3 }} />
          <Legend wrapperStyle={{ fontSize: 12, color: colors.text }} />
          <Bar
            dataKey="APPROVED"
            name="Approved"
            stackId="status"
            fill={colors.status.APPROVED}
            stroke={colors.surface}
            strokeWidth={2}
            maxBarSize={24}
          />
          <Bar
            dataKey="SUBMITTED"
            name="Awaiting review"
            stackId="status"
            fill={colors.status.SUBMITTED}
            stroke={colors.surface}
            strokeWidth={2}
            maxBarSize={24}
          />
          <Bar
            dataKey="NEEDS_CORRECTION"
            name="In correction"
            stackId="status"
            fill={colors.status.NEEDS_CORRECTION}
            stroke={colors.surface}
            strokeWidth={2}
            maxBarSize={24}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
