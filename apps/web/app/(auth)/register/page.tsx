"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SignupForm } from "@/components/signup-form"
import { useAuthHydrated } from "@/lib/hooks/use-auth-hydrated"
import { roleHome } from "@/lib/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function Page() {
  const hydrated = useAuthHydrated()
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  // A signed-in visitor goes straight to the landing page for their role.
  React.useEffect(() => {
    if (hydrated && user) {
      router.replace(roleHome(user.role))
    }
  }, [hydrated, user, router])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {hydrated && !user && <SignupForm />}
      </div>
    </div>
  )
}
