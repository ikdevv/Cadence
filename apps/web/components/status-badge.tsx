import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { statusConfig, type MatrixStatus } from "@/lib/status-config"

export function StatusBadge({
  status,
  className,
  withIcon = false,
}: {
  status: MatrixStatus | string
  className?: string
  withIcon?: boolean
}) {
  const config = statusConfig[status as MatrixStatus] ?? statusConfig.DRAFT
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {withIcon && <Icon className="size-3" />}
      {config.label}
    </Badge>
  )
}
