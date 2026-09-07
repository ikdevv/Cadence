"use client"

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { RegisterSchema } from "@cadence/shared"
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
import { register as registerRequest } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { useAuthStore } from "@/lib/stores/auth-store"

const SignupFormSchema = RegisterSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
type SignupFormInput = z.infer<typeof SignupFormSchema>

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const setSession = useAuthStore((state) => state.setSession)
  const [formError, setFormError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormInput>({ resolver: zodResolver(SignupFormSchema) })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const session = await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
      })
      setSession(session)
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      )
    }
  })

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
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
              <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              <FieldError errors={[errors.confirmPassword]} />
            </Field>
            <FieldGroup>
              <Field>
                <FieldError errors={formError ? [{ message: formError }] : []} />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
