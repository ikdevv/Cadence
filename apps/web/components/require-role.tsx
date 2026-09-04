"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { Role } from "@cadence/shared"
import { useAuthHydrated } from "@/lib/hooks/use-auth-hydrated"
import { roleHome } from "@/lib/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"

/**
 * Navigation UX only: it keeps the wrong role from seeing a page that would
 * fail anyway. The real enforcement is the guard on the API — every one of
 * these routes is also role-guarded server-side.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles?: Role[]
  children: React.ReactNode
}) {
  const hydrated = useAuthHydrated()
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  const allowed = !!user && (!roles || roles.includes(user.role))

  React.useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.replace("/login")
    } else if (!allowed) {
      router.replace(roleHome(user.role))
    }
  }, [hydrated, user, allowed, router])

  if (!hydrated) {
    return (
      <div className="text-muted-foreground p-10 text-sm">Loading...</div>
    )
  }
  if (!allowed) {
    return null
  }
  return <>{children}</>
}
