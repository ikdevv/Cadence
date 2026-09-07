"use client"

import * as React from "react"
import { AppShell } from "@/components/app-shell"
import { RequireRole } from "@/components/require-role"

/** Everything behind a session lives here: signed out, you get sent to /login. */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RequireRole>
      <AppShell>{children}</AppShell>
    </RequireRole>
  )
}
