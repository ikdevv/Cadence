"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartFrame,
  SimpleTable,
  tooltipStyles,
} from "@/components/charts/chart-frame"
import { useChartColors } from "@/lib/chart-theme"

/**
 * Magnitude comparison over named categories: horizontal bars, one hue, value at
 * the tip. Deliberately not one colour per bar — the categories are already named
 * on the axis, and colouring by value would encode bar length twice.
 */
export function MagnitudeBarChart({
  title,
  description,
  data,
  isLoading,
  unit = "",
  tableHead,
}: {
  title: string
  description?: string
  data: { label: string; value: number }[] | undefined
  isLoading: boolean
  unit?: string
  tableHead: [string, string]
}) {
  const colors = useChartColors()
  const rows = data ?? []

  return (
    <ChartFrame
      title={title}
      description={description}
      isLoading={isLoading}
      isEmpty={rows.length === 0 || rows.every((row) => row.value === 0)}
      table={
        <SimpleTable
          head={tableHead}
          rows={rows.map((row) => [row.label, `${row.value}${unit}`])}
        />
      }
    >
      <ResponsiveContainer width="100%" height={Math.max(rows.length * 42, 220)}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 48, bottom: 0, left: 8 }}
          barCategoryGap={12}
        >
          <CartesianGrid stroke={colors.grid} strokeWidth={1} horizontal={false} />
          <XAxis
            type="number"
            stroke={colors.axis}
            tickLine={false}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            stroke={colors.axis}
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <Tooltip
            {...tooltipStyles(colors)}
            cursor={{ fill: colors.grid, opacity: 0.3 }}
            formatter={(value) => [`${value}${unit}`, title]}
          />
          <Bar
            dataKey="value"
            fill={colors.series1}
            maxBarSize={24}
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="value"
              position="right"
              fontSize={11}
              fill={colors.text}
              formatter={(value) => `${value}${unit}`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
