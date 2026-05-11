"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { toast } from "sonner";
import type { AuthUser, TaskItem } from "@/types";
import { taskUpdateSchema } from "@/lib/validators";
import { formatDue } from "@/lib/format-date";
import { priorityLabel, statusLabel } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const commentSchema = z.object({
  content: z.string().min(1).max(4000).trim(),
});

const createFormSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  description: z.string().max(8000).optional().nullable(),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
  dueDate: z.string().max(40).optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

type CommentRow = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; email: string; image: string | null };
};

export function TaskDetailDialog({
  open,
  onOpenChange,
  mode,
  user,
  projectId,
  task,
  projectUsers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  user: AuthUser;
  projectId: string;
  task: TaskItem | null;
  projectUsers: { id: string; name: string; email: string }[];
  onSaved: () => void;
}) {
  const isAdmin = user.role === Role.ADMIN;
  const assigneeOnly =
    !isAdmin && !!task && task.assigneeId === user.id && mode === "edit";

  const createForm = useForm({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      dueDate: null as string | null,
      assigneeId: null as string | null,
    },
  });

  const editForm = useForm({
    resolver: zodResolver(taskUpdateSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      dueDate: null as string | null,
      assigneeId: null as string | null,
    },
  });

  const [comments, setComments] = useState<CommentRow[]>([]);

  useEffect(() => {
    if (!open || mode !== "edit" || !task) {
      setComments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/tasks/${task.id}/comments`);
      if (!res.ok) return;
      const json = (await res.json()) as { comments: CommentRow[] };
      if (!cancelled) setComments(json.comments);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, task]);

  useEffect(() => {
    if (mode === "edit" && task) {
      editForm.reset({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        status: task.status,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate ? formatInputLocal(task.dueDate) : null,
      });
    }
  }, [mode, task, editForm]);

  const commentForm = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  async function onCreate(values: z.infer<typeof createFormSchema>) {
    try {
      const payload = {
        projectId,
        title: values.title,
        description: values.description ?? null,
        priority: values.priority,
        status: values.status,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        assigneeId: values.assigneeId ?? null,
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Task created");
      onSaved();
      onOpenChange(false);
      createForm.reset({
        title: "",
        description: "",
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        dueDate: null,
        assigneeId: null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function onEdit(values: z.infer<typeof taskUpdateSchema>) {
    if (!task) return;
    try {
      const payload = assigneeOnly
        ? { status: values.status }
        : {
            title: values.title,
            description: values.description,
            priority: values.priority,
            status: values.status,
            assigneeId: values.assigneeId,
            dueDate:
              values.dueDate === undefined
                ? undefined
                : values.dueDate
                  ? new Date(values.dueDate).toISOString()
                  : null,
          };
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Task updated");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function onComment(values: z.infer<typeof commentSchema>) {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Comment added");
      commentForm.reset({ content: "" });
      setComments((c) => [...c, json.comment]);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const title = mode === "create" ? "New task" : task?.title ?? "Task";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{title}</DialogTitle>
        </DialogHeader>

        {mode === "create" && isAdmin ? (
          <form
            className="space-y-4"
            onSubmit={createForm.handleSubmit(onCreate)}
          >
            <Field label="Title">
              <Input {...createForm.register("title")} />
              <FieldError msg={createForm.formState.errors.title?.message} />
            </Field>
            <Field label="Description">
              <Textarea {...createForm.register("description")} rows={3} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <Select
                  value={createForm.watch("priority")}
                  onValueChange={(v) =>
                    createForm.setValue("priority", v as TaskPriority)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskPriority).map((p) => (
                      <SelectItem key={p} value={p}>
                        {priorityLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={createForm.watch("status")}
                  onValueChange={(v) =>
                    createForm.setValue("status", v as TaskStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TaskStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Due date">
              <Input type="datetime-local" {...createForm.register("dueDate")} />
            </Field>
            <Field label="Assignee">
              <Select
                value={createForm.watch("assigneeId") ?? "none"}
                onValueChange={(v) =>
                  createForm.setValue("assigneeId", v === "none" ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {projectUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" className="w-full">
              Create task
            </Button>
          </form>
        ) : null}

        {mode === "edit" && task ? (
          <div className="space-y-4">
            {isAdmin || assigneeOnly ? (
              <form
                className="space-y-4"
                onSubmit={editForm.handleSubmit(onEdit)}
              >
                {isAdmin ? (
                  <>
                    <Field label="Title">
                      <Input {...editForm.register("title")} />
                    </Field>
                    <Field label="Description">
                      <Textarea {...editForm.register("description")} rows={3} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Priority">
                        <Select
                          value={editForm.watch("priority")}
                          onValueChange={(v) =>
                            editForm.setValue("priority", v as TaskPriority)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(TaskPriority).map((p) => (
                              <SelectItem key={p} value={p}>
                                {priorityLabel(p)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Status">
                        <Select
                          value={editForm.watch("status")}
                          onValueChange={(v) =>
                            editForm.setValue("status", v as TaskStatus)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(TaskStatus).map((s) => (
                              <SelectItem key={s} value={s}>
                                {statusLabel(s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Due date">
                      <Input type="datetime-local" {...editForm.register("dueDate")} />
                    </Field>
                    <Field label="Assignee">
                      <Select
                        value={editForm.watch("assigneeId") ?? "none"}
                        onValueChange={(v) =>
                          editForm.setValue(
                            "assigneeId",
                            v === "none" ? null : v,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {projectUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                ) : (
                  <Field label="Status">
                    <Select
                      value={editForm.watch("status")}
                      onValueChange={(v) =>
                        editForm.setValue("status", v as TaskStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(TaskStatus).map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Button type="submit" className="w-full">
                  Save changes
                </Button>
              </form>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{priorityLabel(task.priority)}</Badge>
                  <Badge variant="secondary">{statusLabel(task.status)}</Badge>
                </div>
                <p className="text-muted-foreground">
                  Due {formatDue(task.dueDate)}
                </p>
                {task.description ? (
                  <p className="leading-relaxed">{task.description}</p>
                ) : null}
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm font-semibold">Comments</p>
              <ScrollArea className="mt-3 h-44 pr-3">
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-lg bg-muted/40 p-2 text-sm">
                      <p className="text-xs font-medium text-muted-foreground">
                        {c.user.name}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
                    </li>
                  ))}
                  {!comments.length ? (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  ) : null}
                </ul>
              </ScrollArea>
              <form
                className="mt-3 space-y-2"
                onSubmit={commentForm.handleSubmit(onComment)}
              >
                <Textarea
                  placeholder="Write a comment..."
                  rows={3}
                  {...commentForm.register("content")}
                />
                <Button type="submit" size="sm">
                  Comment
                </Button>
              </form>
            </div>

            {isAdmin ? (
              <Button
                variant="destructive"
                type="button"
                className="w-full"
                onClick={async () => {
                  if (!task || !confirm("Delete this task?")) return;
                  const res = await fetch(`/api/tasks/${task.id}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) {
                    toast.error("Could not delete");
                    return;
                  }
                  toast.success("Task deleted");
                  onSaved();
                  onOpenChange(false);
                }}
              >
                Delete task
              </Button>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

/** datetime-local value from ISO string */
function formatInputLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
