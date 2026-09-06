"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { toWeekStart, toWeekStartString } from "@cadence/shared"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * Weeks are ISO (Monday-start) and UTC-normalized to match `toWeekStart`, which
 * the API mirrors in apps/api/src/common/utils/week.ts. Day arithmetic here uses
 * UTC accessors rather than date-fns because date-fns operates in the browser's
 * local zone, which shifts a UTC-midnight Monday into the previous week west of
 * UTC.
 */
function addUTCDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}

/** "Oct 12, 2026 - Oct 18, 2026" for the week containing `weekStart`. */
export function formatWeekRange(weekStart: Date): string {
  const start = toWeekStart(weekStart)
  const end = addUTCDays(start, 6)
  return `${start.toLocaleDateString("en-US", DAY_FORMAT)} - ${end.toLocaleDateString("en-US", DAY_FORMAT)}`
}

export interface WeekPickerProps {
  /** Any date within the selected week; normalized to its Monday. */
  value?: Date | string | null
  onChange: (weekStart: Date) => void
  /** `YYYY-MM-DD` Mondays. When set, every other week is disabled. */
  allowedWeeks?: string[]
  /** When provided, an extra row above the calendar clears the selection. */
  onClear?: () => void
  clearLabel?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  id?: string
}

export function WeekPicker({
  value,
  onChange,
  allowedWeeks,
  onClear,
  clearLabel = "All weeks",
  placeholder = "Pick a week",
  disabled = false,
  className,
  align = "start",
  id,
}: WeekPickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedWeek = React.useMemo(
    () => (value ? toWeekStart(value) : undefined),
    [value],
  )

  const selectedRange = React.useMemo(
    () =>
      selectedWeek
        ? { from: selectedWeek, to: addUTCDays(selectedWeek, 6) }
        : undefined,
    [selectedWeek],
  )

  const disabledWeeks = React.useMemo(() => {
    if (!allowedWeeks) return undefined
    const allowed = new Set(allowedWeeks)
    return (date: Date) => !allowed.has(toWeekStartString(date))
  }, [allowedWeeks])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal",
            !selectedWeek && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon data-icon="inline-start" />
          {selectedWeek ? formatWeekRange(selectedWeek) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        {onClear && (
          <button
            type="button"
            onClick={() => {
              onClear()
              setOpen(false)
            }}
            className={cn(
              "w-full rounded-t-lg border-b px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent",
              !selectedWeek && "text-primary",
            )}
          >
            {clearLabel}
          </button>
        )}
        <Calendar
          mode="range"
          ISOWeek
          timeZone="utc"
          showOutsideDays
          selected={selectedRange}
          disabled={disabledWeeks}
          defaultMonth={selectedWeek}
          // The proposed range is ignored: any click selects that whole week.
          onSelect={(_range, triggerDate) => {
            onChange(toWeekStart(triggerDate))
            setOpen(false)
          }}
          classNames={{
            // The row paints the hover band; selected cells paint over it.
            week:
              "mt-1 flex rounded-lg hover:bg-accent has-[[data-disabled]]:hover:bg-transparent",
            day: "size-8 p-0 text-center text-sm",
            day_button:
              "size-8 rounded-none bg-transparent font-normal outline-none hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50",
            selected: "bg-primary text-primary-foreground",
            range_start: "rounded-l-lg",
            range_end: "rounded-r-lg",
            outside:
              "text-muted-foreground/50 [&[data-selected]]:text-primary-foreground/70",
            disabled: "text-muted-foreground/40 opacity-50",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
