"use client"

import { SignupForm } from "@/components/signup-form"
import { AuthenticatedPanel } from "@/components/authenticated-panel"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useAuthHydrated } from "@/lib/hooks/use-auth-hydrated"

export default function Page() {
  const hydrated = useAuthHydrated()
  const user = useAuthStore((state) => state.user)

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {hydrated && user ? <AuthenticatedPanel user={user} /> : <SignupForm />}
      </div>
    </div>
  )
}
