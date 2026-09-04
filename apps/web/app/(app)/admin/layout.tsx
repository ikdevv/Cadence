"use client"

import * as React from "react"
import { RequireRole } from "@/components/require-role"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={["ADMIN"]}>{children}</RequireRole>
}
