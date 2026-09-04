"use client"

import * as React from "react"
import { RequireRole } from "@/components/require-role"

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireRole roles={["MANAGER", "ADMIN"]}>{children}</RequireRole>
}
