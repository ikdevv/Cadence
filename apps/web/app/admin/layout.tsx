"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useAuthHydrated } from "@/lib/hooks/use-auth-hydrated"

// UX guarding only — the real enforcement is the @Roles('ADMIN') guard on
// the API. This just keeps non-admins from seeing the admin nav/forms.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated()
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  React.useEffect(() => {
    if (hydrated && user?.role !== "ADMIN") {
      router.replace("/login")
    }
  }, [hydrated, user, router])

  if (!hydrated || user?.role !== "ADMIN") {
    return null
  }

  return <>{children}</>
}
