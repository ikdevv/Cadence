"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AcceptInvitationSchema, type AuthSession } from "@cadence/shared"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiClient, ApiError } from "@/lib/api-client"
import { useAuthStore } from "@/lib/stores/auth-store"

const AcceptInvitationFormSchema = AcceptInvitationSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
type AcceptInvitationFormInput = z.infer<typeof AcceptInvitationFormSchema>

export function AcceptInvitationForm({
  token,
  email,
}: {
  token: string
  email: string
}) {
  const router = useRouter()
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationFormInput>({
    resolver: zodResolver(AcceptInvitationFormSchema),
    defaultValues: { token },
  })

  const mutation = useMutation({
    mutationFn: (data: AcceptInvitationFormInput) =>
      apiClient.post<AuthSession>("/invitations/accept", {
        token: data.token,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      }),
    onSuccess: (session) => {
      setSession(session)
      router.push("/")
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      )
    },
  })

  const onSubmit = handleSubmit((data) => {
    setFormError(null)
    mutation.mutate(data)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Registration</CardTitle>
        <CardDescription>You&apos;re joining as {email}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="accept-email">Email</FieldLabel>
              <Input id="accept-email" type="email" value={email} readOnly disabled />
            </Field>
            <Field>
              <FieldLabel htmlFor="accept-first-name">First Name</FieldLabel>
              <Input
                id="accept-first-name"
                aria-invalid={!!errors.firstName}
                {...register("firstName")}
              />
              <FieldError errors={[errors.firstName]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="accept-last-name">Last Name</FieldLabel>
              <Input
                id="accept-last-name"
                aria-invalid={!!errors.lastName}
                {...register("lastName")}
              />
              <FieldError errors={[errors.lastName]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="accept-password">Password</FieldLabel>
              <Input
                id="accept-password"
                type="password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password ? (
                <FieldError errors={[errors.password]} />
              ) : (
                <FieldDescription>Must be at least 8 characters long.</FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="accept-confirm-password">Confirm Password</FieldLabel>
              <Input
                id="accept-confirm-password"
                type="password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              <FieldError errors={[errors.confirmPassword]} />
            </Field>
            <Field>
              <FieldError errors={formError ? [{ message: formError }] : []} />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
