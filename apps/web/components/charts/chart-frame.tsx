"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Every chart gets the same frame: a title, a stated definition where one is
 * needed, an explicit empty state (a blank plot area reads as broken even when
 * it is correct), and a table view so nothing is gated behind colour.
 */
export function ChartFrame({
  title,
  description,
  isLoading,
  isEmpty,
  emptyMessage = "No data for this range yet.",
  table,
  children,
}: {
  title: string
  description?: string
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  table?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isEmpty ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center rounded-md border border-dashed text-sm">
            {emptyMessage}
          </div>
        ) : (
          <>
            {children}
            {table && (
              <details className="mt-3">
                <summary className="text-muted-foreground cursor-pointer text-xs">
                  View as table
                </summary>
                <div className="mt-2 overflow-x-auto">{table}</div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** Tooltip styling shared by every chart, so hovers look the same everywhere. */
export function tooltipStyles(colors: { surface: string; grid: string; text: string }) {
  return {
    contentStyle: {
      backgroundColor: colors.surface,
      border: `1px solid ${colors.grid}`,
      borderRadius: 8,
      fontSize: 12,
      color: colors.text,
    },
    labelStyle: { color: colors.text, fontWeight: 600 },
    itemStyle: { color: colors.text },
  }
}

export function SimpleTable({
  head,
  rows,
}: {
  head: string[]
  rows: (string | number)[][]
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-muted-foreground text-left">
          {head.map((cell) => (
            <th key={cell} className="py-1 pr-4 font-medium">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-t">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-1 pr-4 tabular-nums">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
