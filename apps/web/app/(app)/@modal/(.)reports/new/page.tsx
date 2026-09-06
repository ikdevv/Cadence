"use client"

import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NewReportForm } from "@/components/report/new-report-form"

export default function NewReportModal() {
  const router = useRouter()

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New weekly report</DialogTitle>
          <DialogDescription>
            Pick the week and the project. You can fill in the rest next.
          </DialogDescription>
        </DialogHeader>
        <NewReportForm />
      </DialogContent>
    </Dialog>
  )
}
