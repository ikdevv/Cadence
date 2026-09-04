"use client"

import * as React from "react"
import { RequireRole } from "@/components/require-role"

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireRole roles={["MEMBER"]}>{children}</RequireRole>
}
