import type { ReviewEntry } from "@cadence/shared"
import { CheckCircle2, MessageSquareWarning } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatDateTime } from "@/components/report/version-drawer"

/**
 * The manager's comment, shown prominently rather than tucked into a tab — a
 * member who has been asked for corrections has to see why on arrival.
 */
export function ReviewCommentBanner({ review }: { review: ReviewEntry | null }) {
  if (!review) return null

  const isRejection = review.action === "REQUEST_CHANGES"
  const Icon = isRejection ? MessageSquareWarning : CheckCircle2

  return (
    <Alert
      className={
        isRejection
          ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
          : "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
      }
    >
      <Icon className="size-4" />
      <AlertTitle>
        {isRejection ? "Changes requested" : "Approved"} by {review.reviewerName}
      </AlertTitle>
      <AlertDescription className="space-y-1">
        {review.comment && <p className="whitespace-pre-wrap">{review.comment}</p>}
        <p className="text-xs opacity-80">
          On version {review.versionNumber} · {formatDateTime(review.createdAt)}
        </p>
      </AlertDescription>
    </Alert>
  )
}
