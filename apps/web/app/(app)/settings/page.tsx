"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient, ApiError } from "@/lib/api-client"
import { useAuthStore } from "@/lib/stores/auth-store"

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {user?.email} ({user?.role})
        </p>
      </div>
      <ProfileCard />
      <PasswordCard />
    </div>
  )
}

function ProfileCard() {
  const [name, setName] = React.useState("")
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => apiClient.patch("/users/me", { name }),
    onSuccess: () => {
      setMessage("Name updated.")
      setError(null)
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not save."),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Display name</CardTitle>
        <CardDescription>
          This is the name your manager sees on the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
          />
        </div>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          disabled={name.trim().length === 0 || save.isPending}
          onClick={() => {
            setMessage(null)
            save.mutate()
          }}
        >
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  )
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const change = useMutation({
    mutationFn: () =>
      apiClient.post("/users/me/password", { currentPassword, newPassword }),
    onSuccess: () => {
      setMessage("Password changed. Your other sessions were signed out.")
      setError(null)
      setCurrentPassword("")
      setNewPassword("")
    },
    onError: (err) =>
      setError(
        err instanceof ApiError ? err.message : "Could not change the password.",
      ),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Password</CardTitle>
        <CardDescription>
          Changing it signs out every other session you have open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          disabled={
            currentPassword.length === 0 ||
            newPassword.length < 8 ||
            change.isPending
          }
          onClick={() => {
            setMessage(null)
            change.mutate()
          }}
        >
          {change.isPending ? "Changing..." : "Change password"}
        </Button>
      </CardContent>
    </Card>
  )
}
