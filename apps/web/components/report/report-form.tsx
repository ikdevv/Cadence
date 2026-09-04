"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, type Resolver } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import {
  ReportContentSchema,
  TASK_TYPES,
  type Project,
  type ReportContentInput,
  type ReportDetail,
} from "@cadence/shared"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiClient, ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import { taskTypeLabels } from "@/lib/status-config"

const AUTOSAVE_DELAY_MS = 3000

const emptyTask = {
  name: "",
  priority: "MEDIUM" as const,
  status: "IN_PROGRESS" as const,
  plannedPct: 100,
  actualPct: 0,
  hoursPlanned: 0,
  hoursSpent: 0,
  deliverable: "",
}

function toFormValues(report: ReportDetail): ReportContentInput {
  const version = report.currentVersion
  return {
    projectId: report.project.id,
    tasks: version?.tasks.length ? version.tasks.map((task) => ({ ...task })) : [emptyTask],
    blockers: version?.blockers.map((blocker) => ({ ...blocker })) ?? [],
    achievements:
      version?.achievements.map((achievement) => ({ ...achievement })) ?? [],
    hours: TASK_TYPES.map((taskType) => ({
      taskType,
      hours: version?.hours.find((entry) => entry.taskType === taskType)?.hours ?? 0,
    })),
    notes: version?.notes ?? "",
    links: version?.links ?? "",
    nextWeekPlan: version?.nextWeekPlan ?? "",
  }
}

/** Strips the rows a member left blank so an untouched section saves as empty. */
function toPayload(values: ReportContentInput) {
  return {
    projectId: values.projectId,
    tasks: values.tasks
      .filter((task) => task.name.trim().length > 0)
      .map((task) => ({
        name: task.name,
        priority: task.priority,
        status: task.status,
        plannedPct: Number(task.plannedPct),
        actualPct: Number(task.actualPct),
        hoursPlanned: Number(task.hoursPlanned),
        hoursSpent: Number(task.hoursSpent),
        ...(task.deliverable ? { deliverable: task.deliverable } : {}),
      })),
    blockers: values.blockers
      .filter((blocker) => blocker.description.trim().length > 0)
      .map((blocker) => ({
        description: blocker.description,
        isKeyIssue: !!blocker.isKeyIssue,
      })),
    achievements: values.achievements
      .filter((achievement) => achievement.description.trim().length > 0)
      .map((achievement) => ({
        description: achievement.description,
        isKeyHighlight: !!achievement.isKeyHighlight,
      })),
    hours: values.hours
      .filter((entry) => Number(entry.hours) > 0)
      .map((entry) => ({ taskType: entry.taskType, hours: Number(entry.hours) })),
    nextWeekPlan: values.nextWeekPlan || undefined,
    notes: values.notes || undefined,
    links: values.links || undefined,
  }
}

export function ReportForm({
  report,
  projects,
}: {
  report: ReportDetail
  projects: Project[]
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [savedAt, setSavedAt] = React.useState<Date | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<ReportContentInput>({
    resolver: zodResolver(ReportContentSchema) as Resolver<ReportContentInput>,
    defaultValues: toFormValues(report),
    mode: "onSubmit",
  })

  const tasks = useFieldArray({ control: form.control, name: "tasks" })
  const blockers = useFieldArray({ control: form.control, name: "blockers" })
  const achievements = useFieldArray({
    control: form.control,
    name: "achievements",
  })

  const saveContent = useMutation({
    mutationFn: (values: ReportContentInput) =>
      apiClient.patch<ReportDetail>(
        `/reports/${report.id}/content`,
        toPayload(values),
      ),
    onSuccess: () => {
      setSavedAt(new Date())
      setFormError(null)
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.detail(report.id),
      })
    },
    onError: (error) =>
      setFormError(error instanceof ApiError ? error.message : "Could not save."),
  })

  const submitReport = useMutation({
    mutationFn: async (values: ReportContentInput) => {
      await apiClient.patch(`/reports/${report.id}/content`, toPayload(values))
      return apiClient.post<ReportDetail>(`/reports/${report.id}/submit`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.list() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.detail(report.id),
      })
      router.push(`/reports/${report.id}`)
    },
    onError: (error) =>
      setFormError(
        error instanceof ApiError ? error.message : "Could not submit.",
      ),
  })

  // Autosave: only while the version is editable, and only after a real edit.
  const isDirty = form.formState.isDirty
  const watched = form.watch()
  React.useEffect(() => {
    if (!isDirty || saveContent.isPending) return
    const timer = setTimeout(() => {
      saveContent.mutate(form.getValues())
      form.reset(form.getValues(), { keepValues: true })
    }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, JSON.stringify(watched)])

  /** Draft saves skip validation on purpose — a half-filled week is allowed. */
  const saveDraft = () => saveContent.mutate(form.getValues())

  const onSubmit = form.handleSubmit((values) => submitReport.mutate(values))

  const totalTaskHours = (watched.tasks ?? []).reduce(
    (sum, task) => sum + Number(task.hoursSpent || 0),
    0,
  )
  const totalBreakdownHours = (watched.hours ?? []).reduce(
    (sum, entry) => sum + Number(entry.hours || 0),
    0,
  )

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select
            value={form.watch("projectId")}
            onValueChange={(value) =>
              form.setValue("projectId", value, { shouldDirty: true })
            }
          >
            <SelectTrigger id="projectId">
              <SelectValue placeholder="Pick a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name} ({project.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldMessage message={form.formState.errors.projectId?.message} />
        </div>
        <div className="flex items-end">
          <p className="text-muted-foreground text-sm">
            {saveContent.isPending
              ? "Saving..."
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Changes autosave every few seconds."}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tasks</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => tasks.append(emptyTask)}
          >
            <Plus className="size-3.5" />
            Add task
          </Button>
        </div>
        <FieldMessage message={form.formState.errors.tasks?.message} />

        <div className="overflow-x-auto">
          <div className="min-w-[52rem] space-y-2">
            <div className="text-muted-foreground grid grid-cols-[minmax(12rem,2fr)_7rem_9rem_5rem_5rem_5rem_5rem_minmax(8rem,1fr)_2.5rem] gap-2 text-xs font-medium">
              <span>Task</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Plan %</span>
              <span>Act %</span>
              <span>Hrs plan</span>
              <span>Hrs spent</span>
              <span>Deliverable</span>
              <span />
            </div>
            {tasks.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[minmax(12rem,2fr)_7rem_9rem_5rem_5rem_5rem_5rem_minmax(8rem,1fr)_2.5rem] items-start gap-2"
              >
                <div>
                  <Input
                    placeholder="What did you work on?"
                    {...form.register(`tasks.${index}.name`)}
                  />
                  <FieldMessage
                    message={form.formState.errors.tasks?.[index]?.name?.message}
                  />
                </div>
                <SmallSelect
                  value={form.watch(`tasks.${index}.priority`)}
                  onChange={(value) =>
                    form.setValue(
                      `tasks.${index}.priority`,
                      value as "LOW" | "MEDIUM" | "HIGH",
                      { shouldDirty: true },
                    )
                  }
                  options={[
                    { value: "LOW", label: "Low" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HIGH", label: "High" },
                  ]}
                />
                <SmallSelect
                  value={form.watch(`tasks.${index}.status`)}
                  onChange={(value) =>
                    form.setValue(
                      `tasks.${index}.status`,
                      value as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED",
                      { shouldDirty: true },
                    )
                  }
                  options={[
                    { value: "NOT_STARTED", label: "Not started" },
                    { value: "IN_PROGRESS", label: "In progress" },
                    { value: "COMPLETED", label: "Completed" },
                    { value: "BLOCKED", label: "Blocked" },
                  ]}
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  {...form.register(`tasks.${index}.plannedPct`, {
                    valueAsNumber: true,
                  })}
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  {...form.register(`tasks.${index}.actualPct`, {
                    valueAsNumber: true,
                  })}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  {...form.register(`tasks.${index}.hoursPlanned`, {
                    valueAsNumber: true,
                  })}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  {...form.register(`tasks.${index}.hoursSpent`, {
                    valueAsNumber: true,
                  })}
                />
                <Input
                  placeholder="PR, doc, link"
                  {...form.register(`tasks.${index}.deliverable`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove task"
                  onClick={() => tasks.remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <FlaggedList
          title="Blockers"
          addLabel="Add blocker"
          flagLabel="Key issue"
          placeholder="What is in your way, and who can unblock it?"
          fields={blockers.fields}
          onAdd={() => blockers.append({ description: "", isKeyIssue: false })}
          onRemove={blockers.remove}
          registerText={(index) =>
            form.register(`blockers.${index}.description`)
          }
          isFlagged={(index) => !!form.watch(`blockers.${index}.isKeyIssue`)}
          // Radio semantics: flagging one clears the rest, matching the server rule.
          onFlag={(index) =>
            blockers.fields.forEach((_, i) =>
              form.setValue(`blockers.${i}.isKeyIssue`, i === index, {
                shouldDirty: true,
              }),
            )
          }
          error={form.formState.errors.blockers?.message}
        />

        <FlaggedList
          title="Achievements"
          addLabel="Add achievement"
          flagLabel="Key highlight"
          placeholder="What went well this week?"
          fields={achievements.fields}
          onAdd={() =>
            achievements.append({ description: "", isKeyHighlight: false })
          }
          onRemove={achievements.remove}
          registerText={(index) =>
            form.register(`achievements.${index}.description`)
          }
          isFlagged={(index) =>
            !!form.watch(`achievements.${index}.isKeyHighlight`)
          }
          onFlag={(index) =>
            achievements.fields.forEach((_, i) =>
              form.setValue(`achievements.${i}.isKeyHighlight`, i === index, {
                shouldDirty: true,
              }),
            )
          }
          error={form.formState.errors.achievements?.message}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Hours by task type</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TASK_TYPES.map((taskType, index) => (
            <div key={taskType} className="space-y-1">
              <Label htmlFor={`hours-${taskType}`} className="text-xs">
                {taskTypeLabels[taskType]}
              </Label>
              <Input
                id={`hours-${taskType}`}
                type="number"
                min={0}
                step="0.5"
                {...form.register(`hours.${index}.hours`, {
                  valueAsNumber: true,
                })}
              />
            </div>
          ))}
        </div>
        {totalBreakdownHours > 0 &&
          Math.abs(totalBreakdownHours - totalTaskHours) > 0.5 && (
            <p className="text-muted-foreground text-xs">
              Breakdown totals {totalBreakdownHours} h against {totalTaskHours} h
              logged on tasks. That is fine — it will not block submission.
            </p>
          )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nextWeekPlan">Plan for next week</Label>
          <Textarea id="nextWeekPlan" rows={4} {...form.register("nextWeekPlan")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={4} {...form.register("notes")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="links">Links</Label>
          <Textarea id="links" rows={2} {...form.register("links")} />
        </div>
      </div>

      {formError && <p className="text-destructive text-sm">{formError}</p>}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={saveDraft}
          disabled={saveContent.isPending}
        >
          Save draft
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" disabled={submitReport.isPending}>
              Submit for review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit this report?</DialogTitle>
              <DialogDescription>
                Once submitted, the report becomes read-only until your manager
                reviews it. If they request changes you will get an editable copy
                back with this content already filled in.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={() => onSubmit()}
                disabled={submitReport.isPending}
              >
                {submitReport.isPending ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </form>
  )
}

function FieldMessage({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-destructive mt-1 text-xs">{message}</p>
}

function SmallSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FlaggedList({
  title,
  addLabel,
  flagLabel,
  placeholder,
  fields,
  onAdd,
  onRemove,
  registerText,
  isFlagged,
  onFlag,
  error,
}: {
  title: string
  addLabel: string
  flagLabel: string
  placeholder: string
  fields: { id: string }[]
  onAdd: () => void
  onRemove: (index: number) => void
  registerText: (index: number) => ReturnType<
    ReturnType<typeof useForm<ReportContentInput>>["register"]
  >
  isFlagged: (index: number) => boolean
  onFlag: (index: number) => void
  error?: string
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      </div>
      <FieldMessage message={error} />
      {fields.length === 0 && (
        <p className="text-muted-foreground text-sm">Nothing added yet.</p>
      )}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-md border p-3">
            <Textarea rows={2} placeholder={placeholder} {...registerText(index)} />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  checked={isFlagged(index)}
                  onChange={() => onFlag(index)}
                  className="accent-primary size-3.5"
                />
                {flagLabel}
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
