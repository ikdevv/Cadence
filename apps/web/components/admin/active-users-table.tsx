"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

interface ActiveUser {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

export function ActiveUsersTable() {
  const { data: page, isLoading, isError } = useQuery({
    queryKey: queryKeys.users.active(),
    queryFn: () =>
      apiClient.get<{ data: ActiveUser[] }>("/users?pageSize=100"),
  })
  const data = page?.data

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading users...</p>
  }
  if (isError) {
    return <p className="text-destructive text-sm">Failed to load users.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.length ? (
          data.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{user.role}</Badge>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={3} className="text-muted-foreground text-center">
              No active users.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
