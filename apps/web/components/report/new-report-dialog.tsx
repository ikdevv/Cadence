"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NewReportForm } from "@/components/report/new-report-form"

/** Opens on button click and closes itself once the report is created. */
export function NewReportDialog({
  triggerLabel = "New report",
}: {
  triggerLabel?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New weekly report</DialogTitle>
          <DialogDescription>
            Pick the week and the project. You can fill in the rest next.
          </DialogDescription>
        </DialogHeader>
        <NewReportForm onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
