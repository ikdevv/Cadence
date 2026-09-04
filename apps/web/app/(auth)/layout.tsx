import * as React from "react"
import { ModeToggle } from "@/components/mode-toggle"

/** Login and register sit outside the app shell, so the toggle lives here. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>
      {children}
    </>
  )
}
