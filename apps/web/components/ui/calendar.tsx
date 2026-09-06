"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames, type DayPickerProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = DayPickerProps

function Calendar({ className, classNames, ...props }: CalendarProps) {
  const defaults = getDefaultClassNames()

  return (
    <DayPicker
      className={cn("w-fit", className)}
      classNames={{
        root: cn(defaults.root, "p-1"),
        months: "flex flex-col gap-3",
        month: "flex flex-col gap-3",
        nav: "flex items-center justify-between gap-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground",
        ),
        month_caption: "flex h-7 items-center justify-center px-8",
        caption_label: "text-sm font-medium",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground w-8 text-[0.7rem] font-normal uppercase",
        weeks: "flex flex-col",
        week: "mt-1 flex",
        day: "size-8 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-8 font-normal",
        ),
        today: "font-semibold underline underline-offset-2",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/40 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft {...rest} />
          ) : (
            <ChevronRight {...rest} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
