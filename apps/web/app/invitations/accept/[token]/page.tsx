"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { ValidateInvitationResult } from "@cadence/shared"
import { AcceptInvitationForm } from "@/components/accept-invitation-form"
import { InvitationStatusMessage } from "@/components/invitation-status-message"
import { apiClient } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

export default function AcceptInvitationPage() {
  const params = useParams<{ token: string }>()
  const token = params.token

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.invitations.validate(token),
    queryFn: () =>
      apiClient.get<ValidateInvitationResult>(
        `/invitations/validate/${encodeURIComponent(token)}`,
      ),
  })

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {isLoading && (
          <p className="text-muted-foreground text-center text-sm">Validating invitation...</p>
        )}
        {isError && <InvitationStatusMessage reason="INVALID" />}
        {data && !data.valid && <InvitationStatusMessage reason={data.reason} />}
        {data?.valid && <AcceptInvitationForm token={token} email={data.email} />}
      </div>
    </div>
  )
}
