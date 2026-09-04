"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatWeek, type TrendPoint } from "@cadence/shared"
import {
  ChartFrame,
  SimpleTable,
  tooltipStyles,
} from "@/components/charts/chart-frame"
import { useChartColors } from "@/lib/chart-theme"

export function TasksTrendChart({
  data,
  isLoading,
}: {
  data: TrendPoint[] | undefined
  isLoading: boolean
}) {
  const colors = useChartColors()
  const rows = (data ?? []).map((point) => ({
    ...point,
    label: formatWeek(point.weekStart),
  }))

  return (
    <ChartFrame
      title="Tasks completed by week"
      description="Completed against everything planned, across the team."
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      table={
        <SimpleTable
          head={["Week", "Completed", "Total"]}
          rows={rows.map((row) => [row.label, row.completedTasks, row.totalTasks])}
        />
      }
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid
            stroke={colors.grid}
            strokeWidth={1}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke={colors.axis}
            tickLine={false}
            fontSize={11}
          />
          <YAxis
            stroke={colors.axis}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            fontSize={11}
          />
          <Tooltip {...tooltipStyles(colors)} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: colors.text }}
          />
          <Line
            type="monotone"
            dataKey="completedTasks"
            name="Completed"
            stroke={colors.series1}
            strokeWidth={2}
            strokeLinecap="round"
            // 2px surface ring keeps the dot legible where the lines cross.
            dot={{ r: 4, fill: colors.series1, stroke: colors.surface, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="totalTasks"
            name="Planned"
            stroke={colors.series2}
            strokeWidth={2}
            strokeLinecap="round"
            dot={{ r: 4, fill: colors.series2, stroke: colors.surface, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
