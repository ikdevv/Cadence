"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import {
  CreateInvitationSchema,
  type CreateInvitationInput,
  type Invitation,
  type Role,
} from "@cadence/shared"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient, ApiError } from "@/lib/api-client"

const ROLES: Role[] = ["MEMBER", "MANAGER", "ADMIN"]

export function InviteUserDialog() {
  const [open, setOpen] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvitationInput>({
    resolver: zodResolver(CreateInvitationSchema),
    defaultValues: { role: "MEMBER" },
  })

  const mutation = useMutation({
    mutationFn: (data: CreateInvitationInput) =>
      apiClient.post<Invitation>("/invitations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
      reset({ email: "", role: "MEMBER" })
      setFormError(null)
      setOpen(false)
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      )
    },
  })

  const onSubmit = handleSubmit((data) => mutation.mutate(data))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                placeholder="m@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select
                value={watch("role")}
                onValueChange={(value) => setValue("role", value as Role)}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[errors.role]} />
            </Field>
            <FieldError errors={formError ? [{ message: formError }] : []} />
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
