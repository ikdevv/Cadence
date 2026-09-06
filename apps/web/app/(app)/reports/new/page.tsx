"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NewReportForm } from "@/components/report/new-report-form"

export default function NewReportPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New weekly report</CardTitle>
          <CardDescription>
            Pick the week and the project. You can fill in the rest next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewReportForm />
        </CardContent>
      </Card>
    </div>
  )
}
