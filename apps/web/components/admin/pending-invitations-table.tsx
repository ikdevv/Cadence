"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Invitation } from "@cadence/shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  cancelInvitation,
  listInvitations,
  resendInvitation,
} from "@/lib/api/invitations"
import { queryKeys } from "@/lib/query-keys"

const STATUS_VARIANT: Record<Invitation["status"], "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "default",
  ACCEPTED: "secondary",
  EXPIRED: "outline",
  CANCELLED: "destructive",
}

export function PendingInvitationsTable() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.invitations.list(),
    queryFn: () => listInvitations(),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["invitations"] })

  const resend = useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: invalidate,
  })
  const cancel = useMutation({
    mutationFn: (id: string) => cancelInvitation(id),
    onSuccess: invalidate,
  })

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading invitations...</p>
  }
  if (isError) {
    return <p className="text-destructive text-sm">Failed to load invitations.</p>
  }

  const invitations = data?.filter((i) => i.status !== "ACCEPTED") ?? []

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Invited By</TableHead>
          <TableHead>Invited At</TableHead>
          <TableHead>Expires At</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.length ? (
          invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{invitation.role}</Badge>
              </TableCell>
              <TableCell>{invitation.invitedByName}</TableCell>
              <TableCell>{new Date(invitation.createdAt).toLocaleString()}</TableCell>
              <TableCell>{new Date(invitation.expiresAt).toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[invitation.status]}>
                  {invitation.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {invitation.status === "PENDING" || invitation.status === "EXPIRED" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => resend.mutate(invitation.id)}
                        disabled={resend.isPending}
                      >
                        Resend
                      </DropdownMenuItem>
                      {invitation.status === "PENDING" && (
                        <DropdownMenuItem
                          onClick={() => cancel.mutate(invitation.id)}
                          disabled={cancel.isPending}
                          variant="destructive"
                        >
                          Cancel
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground text-center">
              No pending invitations.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
