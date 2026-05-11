"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  KanbanSquare,
  LayoutList,
  MailPlus,
  Sparkles,
} from "lucide-react";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { toast } from "sonner";
import type { AuthUser, TaskItem } from "@/types";
import { useAuthStore } from "@/stores/auth-store";
import { formatDue, relativeTime } from "@/lib/format-date";
import { isOverdue } from "@/lib/format-date";
import { priorityLabel, statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProjectPayload = {
  id: string;
  name: string;
  description: string | null;
  deadline: string | null;
  ownerId: string;
  owner: { id: string; name: string; email: string; image: string | null };
  members: {
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
      role: Role;
    };
  }[];
  tasks: TaskItem[];
  activities: {
    id: string;
    title: string;
    createdAt: string;
    user: { id: string; name: string; image: string | null };
  }[];
};

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user) as AuthUser | null;

  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [tasksAll, setTasksAll] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  const refreshTasks = useCallback(async () => {
    const qs = new URLSearchParams({ projectId });
    const res = await fetch(`/api/tasks?${qs.toString()}`);
    if (!res.ok) return;
    const json = (await res.json()) as { tasks: TaskItem[] };
    setTasksAll(json.tasks);
  }, [projectId]);

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) {
      toast.error("Project not found");
      router.push("/projects");
      return;
    }
    const json = (await res.json()) as { project: ProjectPayload };
    setProject(json.project);
  }, [projectId, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadProject();
      await refreshTasks();
      const u = await fetch(`/api/users?projectId=${projectId}`);
      if (u.ok) {
        const j = (await u.json()) as {
          users: { id: string; name: string; email: string }[];
        };
        if (!cancelled) setUsers(j.users);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProject, projectId, refreshTasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasksAll.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tasksAll, search, statusFilter, priorityFilter]);

  useEffect(() => {
    const tid = params.get("task");
    if (!tid || !tasksAll.length) return;
    const found = tasksAll.find((t) => t.id === tid);
    if (found) {
      setActiveTask(found);
      setDialogMode("edit");
      setDialogOpen(true);
    }
  }, [params, tasksAll]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success("Member invited");
      setInviteOpen(false);
      setInviteEmail("");
      await loadProject();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const stats = useMemo(() => {
    const total = tasksAll.length;
    const completed = tasksAll.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    ).length;
    const overdue = tasksAll.filter((t) =>
      isOverdue(t.dueDate, t.status),
    ).length;
    return {
      total,
      completed,
      overdue,
      progress: total ? completed / total : 0,
    };
  }, [tasksAll]);

  const canDragTask = (t: TaskItem) =>
    !!user &&
    (user.role === Role.ADMIN ||
      (user.role === Role.MEMBER && t.assigneeId === user.id));

  function openCreate() {
    setDialogMode("create");
    setActiveTask(null);
    setDialogOpen(true);
  }

  function openEdit(task: TaskItem) {
    setDialogMode("edit");
    setActiveTask(task);
    setDialogOpen(true);
  }

  if (loading || !project || !user) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="gap-2 px-0" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Workspace
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {project.description ?? "Add context so everyone understands the mission."}
          </p>
          <p className="text-xs text-muted-foreground">
            Deadline · {project.deadline ? formatDue(project.deadline) : "Not set"}
          </p>
        </div>
        {user.role === Role.ADMIN ? (
          <div className="flex flex-wrap gap-2">
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <MailPlus className="h-4 w-4" /> Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite teammate</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={invite}>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Send invite
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button className="gap-2 shadow-lg shadow-primary/15" onClick={openCreate}>
              New task
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Progress" value={`${Math.round(stats.progress * 100)}%`} />
        <Stat label="Completed" value={`${stats.completed}/${stats.total}`} />
        <Stat
          label="Overdue"
          value={String(stats.overdue)}
          danger={stats.overdue > 0}
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="glass w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <LayoutList className="h-4 w-4" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2">
            <KanbanSquare className="h-4 w-4" /> Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Squad</CardTitle>
                <CardDescription>Humans shipping this initiative</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {project.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-sm"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">
                        {m.user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-none">{m.user.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.user.role.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Recent pulses</CardTitle>
                <CardDescription>Live telemetry from this project</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-60 pr-3">
                  <ul className="space-y-3 text-sm">
                    {project.activities.map((a) => (
                      <li key={a.id} className="rounded-lg bg-muted/30 p-3">
                        <p>{a.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.user.name} · {relativeTime(a.createdAt)}
                        </p>
                      </li>
                    ))}
                    {!project.activities.length ? (
                      <p className="text-muted-foreground">No activity yet.</p>
                    ) : null}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Task registry</CardTitle>
              <CardDescription>Filter, inspect, and collaborate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="lg:max-w-xs"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="lg:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.values(TaskStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="lg:w-44">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    {Object.values(TaskPriority).map((p) => (
                      <SelectItem key={p} value={p}>
                        {priorityLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <motion.button
                    key={task.id}
                    type="button"
                    layout
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-xl border border-border/70 bg-muted/15 px-4 py-3 text-left transition hover:border-primary/35 hover:bg-muted/25",
                      isOverdue(task.dueDate, task.status) &&
                        "border-red-500/35 bg-red-500/5",
                    )}
                    onClick={() => openEdit(task)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{task.title}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {priorityLabel(task.priority)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {statusLabel(task.status)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Due {formatDue(task.dueDate)}
                      {task.assignee ? ` · ${task.assignee.name}` : ""}
                    </p>
                  </motion.button>
                ))}
                {!filteredTasks.length ? (
                  <p className="text-sm text-muted-foreground">No tasks match filters.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="board">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Kanban</CardTitle>
              <CardDescription>
                Drag cards across lanes — updates sync instantly with optimistic UI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KanbanBoard
                tasks={tasksAll}
                canDragTask={canDragTask}
                onTaskUpdate={setTasksAll}
                onOpenTask={openEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        user={user}
        projectId={projectId}
        task={activeTask}
        projectUsers={users}
        onSaved={() => {
          void loadProject();
          void refreshTasks();
        }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card
      className={cn(
        "glass border-border/70",
        danger && "border-red-500/30 bg-red-500/5",
      )}
    >
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
