"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CreateProjectSchema,
  type CreateProjectInput,
  type Project,
} from "@cadence/shared"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient, ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

/** Create and edit share one dialog — the fields are identical. */
export function ProjectDialog({
  project,
  trigger,
}: {
  project?: Project
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const queryClient = useQueryClient()

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: project?.name ?? "",
      code: project?.code ?? "",
      color: project?.color ?? "#2563EB",
    },
  })

  const save = useMutation({
    mutationFn: (values: CreateProjectInput) =>
      project
        ? apiClient.patch(`/projects/${project.id}`, values)
        : apiClient.post("/projects", values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setOpen(false)
      form.reset()
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not save."),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit((values) => {
            setError(null)
            save.mutate(values)
          })}
        >
          <DialogHeader>
            <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>
              The code shows as a chip on the dashboard, and the colour follows
              the project across every table.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" placeholder="CLA" {...form.register("code")} />
                {form.formState.errors.code && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Colour</Label>
                <Input
                  id="color"
                  type="color"
                  className="h-9 p-1"
                  {...form.register("color")}
                />
              </div>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
