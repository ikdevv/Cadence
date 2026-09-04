import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const MESSAGES = {
  INVALID: {
    title: "Invalid Invitation",
    description: "This invitation link is invalid or no longer exists.",
  },
  EXPIRED: {
    title: "Invitation Expired",
    description:
      "This invitation has expired. Please contact the administrator for a new invitation.",
  },
  CANCELLED: {
    title: "Invitation Cancelled",
    description: "This invitation is no longer valid.",
  },
  ACCEPTED: {
    title: "Invitation Already Accepted",
    description: "This invitation has already been used.",
  },
} as const

export function InvitationStatusMessage({
  reason,
}: {
  reason: keyof typeof MESSAGES
}) {
  const { title, description } = MESSAGES[reason]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
