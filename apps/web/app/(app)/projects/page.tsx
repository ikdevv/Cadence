"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Project } from "@cadence/shared"
import { ProjectDialog } from "@/components/projects/project-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiClient } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

export default function ProjectsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.projects.list(true),
    queryFn: () => apiClient.get<Project[]>("/projects?includeInactive=true"),
  })

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive
        ? apiClient.patch(`/projects/${id}`, { isActive: true })
        : apiClient.delete(`/projects/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Deactivating a project hides it from the report form but keeps it on
            every report that already used it.
          </p>
        </div>
        <ProjectDialog trigger={<Button>New project</Button>} />
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {isError && (
        <p className="text-destructive text-sm">Could not load projects.</p>
      )}

      {data && (
        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[40rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Colour</TableHead>
                <TableHead className="text-right">Reports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.code}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-4 rounded"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-muted-foreground text-xs">
                        {project.color}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {project.reportCount ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={project.isActive ? "secondary" : "outline"}>
                      {project.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ProjectDialog
                        project={project}
                        trigger={
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      {project.isActive ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Deactivate
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Deactivate {project.name}?
                              </DialogTitle>
                              <DialogDescription>
                                It stops appearing in the report form&apos;s
                                project list. The {project.reportCount ?? 0}{" "}
                                report(s) already filed against it keep it, and
                                it stays in analytics.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button
                                  onClick={() =>
                                    setActive.mutate({
                                      id: project.id,
                                      isActive: false,
                                    })
                                  }
                                >
                                  Deactivate
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActive.mutate({ id: project.id, isActive: true })
                          }
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
