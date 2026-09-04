"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { navFor } from "@/lib/navigation"
import { useAuthStore } from "@/lib/stores/auth-store"
import { cn } from "@/lib/utils"

/**
 * Sidebar on desktop, a scrollable bar under the header on small screens, so
 * every page keeps its navigation at 375px without a hamburger.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const clearSession = useAuthStore((state) => state.clearSession)
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()

  const items = navFor(user?.role)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  async function logout() {
    if (refreshToken) {
      await apiClient.post("/auth/logout", { refreshToken }).catch(() => {})
    }
    clearSession()
    queryClient.clear()
    router.replace("/login")
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="bg-sidebar md:border-sidebar-border flex shrink-0 flex-col border-b md:h-svh md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center justify-between p-4 md:block">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Cadence
            </Link>
            <p className="text-muted-foreground hidden text-xs md:block">
              Weekly reports
            </p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-x-visible md:pb-0">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden gap-2 border-t p-3 md:flex md:flex-col">
          <div className="px-1">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <p className="text-muted-foreground text-xs">{user?.role}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-3.5" />
            Log out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">{children}</div>
        <div className="flex justify-center p-4 md:hidden">
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-3.5" />
            Log out
          </Button>
        </div>
      </main>
    </div>
  )
}
