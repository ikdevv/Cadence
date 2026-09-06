"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flag, Plus, Star, Trash2 } from "lucide-react";
import {
  ReportContentSchema,
  TASK_TYPES,
  type Project,
  type ReportContentInput,
  type ReportDetail,
} from "@cadence/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  submitReport as submitReportRequest,
  updateReportContent,
} from "@/lib/api/reports";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { taskTypeLabels } from "@/lib/status-config";

const AUTOSAVE_DELAY_MS = 10000;

const emptyTask = {
  name: "",
  priority: "MEDIUM" as const,
  status: "IN_PROGRESS" as const,
  plannedPct: 100,
  actualPct: 0,
  hoursPlanned: 0,
  hoursSpent: 0,
  deliverable: "",
};

function toFormValues(report: ReportDetail): ReportContentInput {
  const version = report.currentVersion;
  return {
    projectId: report.project.id,
    tasks: version?.tasks.length
      ? version.tasks.map((task) => ({ ...task }))
      : [emptyTask],
    blockers: version?.blockers.map((blocker) => ({ ...blocker })) ?? [],
    achievements:
      version?.achievements.map((achievement) => ({ ...achievement })) ?? [],
    hours: TASK_TYPES.map((taskType) => ({
      taskType,
      hours:
        version?.hours.find((entry) => entry.taskType === taskType)?.hours ?? 0,
    })),
    notes: version?.notes ?? "",
    links: version?.links ?? "",
    nextWeekPlan: version?.nextWeekPlan ?? "",
  };
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
      .map((entry) => ({
        taskType: entry.taskType,
        hours: Number(entry.hours),
      })),
    nextWeekPlan: values.nextWeekPlan || undefined,
    notes: values.notes || undefined,
    links: values.links || undefined,
  };
}

export function ReportForm({
  report,
  projects,
}: {
  report: ReportDetail;
  projects: Project[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<ReportContentInput>({
    resolver: zodResolver(ReportContentSchema) as Resolver<ReportContentInput>,
    defaultValues: toFormValues(report),
    mode: "onSubmit",
  });

  const tasks = useFieldArray({ control: form.control, name: "tasks" });
  const blockers = useFieldArray({ control: form.control, name: "blockers" });
  const achievements = useFieldArray({
    control: form.control,
    name: "achievements",
  });

  const saveContent = useMutation({
    mutationFn: (values: ReportContentInput) =>
      updateReportContent(report.publicId, toPayload(values)),
    onSuccess: () => {
      setSavedAt(new Date());
      setFormError(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.detail(report.publicId),
      });
    },
    onError: (error) =>
      setFormError(
        error instanceof ApiError ? error.message : "Could not save.",
      ),
  });

  const submitReport = useMutation({
    mutationFn: async (values: ReportContentInput) => {
      await updateReportContent(report.publicId, toPayload(values));
      return submitReportRequest(report.publicId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.list() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.reports.detail(report.publicId),
      });
      router.push(`/reports/${report.publicId}`);
    },
    onError: (error) =>
      setFormError(
        error instanceof ApiError ? error.message : "Could not submit.",
      ),
  });

  // Autosave: only while the version is editable, and only after a real edit.
  const isDirty = form.formState.isDirty;
  const watched = form.watch();
  React.useEffect(() => {
    if (!isDirty || saveContent.isPending) return;
    const timer = setTimeout(() => {
      saveContent.mutate(form.getValues());
      form.reset(form.getValues(), { keepValues: true });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, JSON.stringify(watched)]);

  /** Draft saves skip validation on purpose — a half-filled week is allowed. */
  const saveDraft = () => saveContent.mutate(form.getValues());

  const onSubmit = form.handleSubmit((values) => submitReport.mutate(values));

  const totalBreakdownHours = (watched.hours ?? []).reduce(
    (sum, entry) => sum + Number(entry.hours || 0),
    0,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Report details</CardTitle>
          <CardDescription>
            The project this week&apos;s work is logged against.
          </CardDescription>
          <CardAction>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {saveContent.isPending ? (
                "Saving..."
              ) : savedAt ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  Saved{" "}
                  {savedAt.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              ) : (
                "Changes autosave every few seconds."
              )}
            </p>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="projectId">Project</Label>
            <Select
              value={form.watch("projectId")}
              onValueChange={(value) =>
                form.setValue("projectId", value, { shouldDirty: true })
              }
            >
              <SelectTrigger id="projectId" className="w-full">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks completed this week</CardTitle>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => tasks.append(emptyTask)}
            >
              <Plus className="size-3.5" />
              Add task
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2">
          <FieldMessage message={form.formState.errors.tasks?.message} />

          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-248">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-48">Task</TableHead>
                  <TableHead className="w-28">Priority</TableHead>
                  <TableHead className="w-36">Status</TableHead>
                  <TableHead className="w-20">Plan %</TableHead>
                  <TableHead className="w-20">Act %</TableHead>
                  <TableHead className="w-20">Hrs plan</TableHead>
                  <TableHead className="w-20">Hrs spent</TableHead>
                  <TableHead className="min-w-36">Deliverable</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="align-top whitespace-normal">
                      <Input
                        placeholder="What did you work on?"
                        {...form.register(`tasks.${index}.name`)}
                      />
                      <FieldMessage
                        message={
                          form.formState.errors.tasks?.[index]?.name?.message
                        }
                      />
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <SmallSelect
                        value={form.watch(`tasks.${index}.status`)}
                        onChange={(value) =>
                          form.setValue(
                            `tasks.${index}.status`,
                            value as
                              | "NOT_STARTED"
                              | "IN_PROGRESS"
                              | "COMPLETED"
                              | "BLOCKED",
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
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...form.register(`tasks.${index}.plannedPct`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...form.register(`tasks.${index}.actualPct`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        {...form.register(`tasks.${index}.hoursPlanned`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        {...form.register(`tasks.${index}.hoursSpent`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Input
                        placeholder="PR, doc, link"
                        {...form.register(`tasks.${index}.deliverable`)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove task"
                        onClick={() => tasks.remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <FlaggedList
          title="Blockers"
          addLabel="Add blocker"
          flagLabel="Key issue"
          flagIcon={Flag}
          flagActiveClassName="border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
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
          flagIcon={Star}
          flagActiveClassName="border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
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

      <Card>
        <CardHeader>
          <CardTitle>Hours by task type</CardTitle>
          <CardAction>
            <Badge variant="outline">
              Total logged{" "}
              <strong className="ml-1 font-semibold">
                {totalBreakdownHours}
              </strong>
              &nbsp;h
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan &amp; notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nextWeekPlan">Plan for next week</Label>
              <Textarea
                id="nextWeekPlan"
                rows={4}
                {...form.register("nextWeekPlan")}
              />
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
        </CardContent>
      </Card>

      {formError && <p className="text-destructive text-sm">{formError}</p>}

      <div className="flex flex-wrap justify-end gap-3 border-t pt-6">
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
                reviews it. If they request changes you will get an editable
                copy back with this content already filled in.
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
  );
}

function FieldMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs">{message}</p>;
}

function SmallSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
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
  );
}

function FlaggedList({
  title,
  addLabel,
  flagLabel,
  flagIcon: FlagIcon,
  flagActiveClassName,
  placeholder,
  fields,
  onAdd,
  onRemove,
  registerText,
  isFlagged,
  onFlag,
  error,
}: {
  title: string;
  addLabel: string;
  flagLabel: string;
  flagIcon: React.ComponentType<{ className?: string }>;
  flagActiveClassName: string;
  placeholder: string;
  fields: { id: string }[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  registerText: (
    index: number,
  ) => ReturnType<ReturnType<typeof useForm<ReportContentInput>>["register"]>;
  isFlagged: (index: number) => boolean;
  onFlag: (index: number) => void;
  error?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <FieldMessage message={error} />
        {fields.length === 0 && (
          <p className="text-muted-foreground text-sm">Nothing added yet.</p>
        )}
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-2 rounded-lg border p-3">
              <Textarea
                rows={2}
                placeholder={placeholder}
                {...registerText(index)}
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-pressed={isFlagged(index)}
                  onClick={() => onFlag(index)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    isFlagged(index)
                      ? flagActiveClassName
                      : "border-transparent text-muted-foreground hover:bg-muted",
                  )}
                >
                  <FlagIcon
                    className={cn(
                      "size-3.5",
                      isFlagged(index) && "fill-current",
                    )}
                  />
                  {flagLabel}
                </button>
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
      </CardContent>
    </Card>
  );
}
