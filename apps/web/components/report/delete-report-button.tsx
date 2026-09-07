"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiError } from "@/lib/api/client"
import { deleteReport } from "@/lib/api/reports"
import { queryKeys } from "@/lib/query-keys"

/** Delete is only ever offered for DRAFT reports — the API rejects anything else. */
export function DeleteReportButton({
  reportId,
  weekLabel,
  onDeleted,
  size = "sm",
}: {
  reportId: string
  weekLabel: string
  onDeleted?: () => void
  size?: "sm" | "default"
}) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: () => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.list() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.availableWeeks(),
      })
      setOpen(false)
      onDeleted?.()
    },
    onError: (err) =>
      setError(
        err instanceof ApiError ? err.message : "Could not delete this report.",
      ),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setError(null)
      }}
    >
      <Button
        variant="destructive"
        size={size === "sm" ? "sm" : "default"}
        onClick={() => setOpen(true)}
      >
        <TrashIcon />
        Delete
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete draft report?</DialogTitle>
          <DialogDescription>
            This deletes your draft for {weekLabel} and everything in it. This
            can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? "Deleting..." : "Delete report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
