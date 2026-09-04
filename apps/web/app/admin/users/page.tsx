"use client"

import { ActiveUsersTable } from "@/components/admin/active-users-table"
import { PendingInvitationsTable } from "@/components/admin/pending-invitations-table"
import { InviteUserDialog } from "@/components/admin/invite-user-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <InviteUserDialog />
      </div>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="pending">Pending Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <ActiveUsersTable />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <PendingInvitationsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
