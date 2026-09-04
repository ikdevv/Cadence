import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string | number
  /** Shown under the number — used to state a definition the brief leaves open. */
  hint?: string
  tone?: "default" | "warning" | "danger" | "success"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
            tone === "warning" && "text-amber-600 dark:text-amber-400",
            tone === "danger" && "text-destructive",
            tone === "success" && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {value}
        </p>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}
