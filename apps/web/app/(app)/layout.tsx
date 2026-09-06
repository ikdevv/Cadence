"use client"

import * as React from "react"
import { AppShell } from "@/components/app-shell"
import { RequireRole } from "@/components/require-role"

/** Everything behind a session lives here: signed out, you get sent to /login. */
export default function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <RequireRole>
      <AppShell>
        {children}
        {modal}
      </AppShell>
    </RequireRole>
  )
}
