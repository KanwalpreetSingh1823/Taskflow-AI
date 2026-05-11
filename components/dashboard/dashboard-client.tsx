"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Flame,
  Layers,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { formatDue, relativeTime } from "@/lib/format-date";
import { priorityLabel, statusLabel } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardPayload =
  | {
      scope: "admin";
      totals: {
        projects: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
      };
      velocity: number;
      productivity: { day: string; completed: number }[];
      distribution: { todo: number; inProgress: number; completed: number };
      activity: {
        id: string;
        title: string;
        createdAt: string;
        user: { id: string; name: string; image: string | null };
      }[];
      upcomingDeadlines: {
        id: string;
        title: string;
        dueDate: string | null;
        status: string;
        project: { id: string; name: string };
        assignee: { id: string; name: string } | null;
      }[];
    }
  | {
      scope: "member";
      totals: {
        projects: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
      };
      productivity: { day: string; completed: number }[];
      distribution: { todo: number; inProgress: number; completed: number };
      tasks: {
        id: string;
        title: string;
        status: string;
        priority: string;
        dueDate: string | null;
        project: { id: string; name: string };
      }[];
      activity: {
        id: string;
        title: string;
        createdAt: string;
        user: { id: string; name: string; image: string | null };
      }[];
      insights: { title: string; detail: string }[];
    };

const COLORS = ["#8b5cf6", "#22d3ee", "#34d399"];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  delay,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Layers;
  delay: number;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl"
    >
      <div
        className={cn(
          "glass gradient-border relative z-[1] h-full rounded-2xl p-[1px]",
          accent,
        )}
      >
        <div className="rounded-2xl bg-card/80 p-5 backdrop-blur-md transition-colors group-hover:bg-card/95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {title}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
              {subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary shadow-inner">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-primary/25 to-cyan-400/10 blur-2xl transition-opacity group-hover:opacity-90" />
    </motion.div>
  );
}

export function DashboardClient() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as DashboardPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const isAdmin = user?.role === Role.ADMIN;
  const pieData = [
    { name: "Todo", value: data.distribution.todo },
    { name: "In progress", value: data.distribution.inProgress },
    { name: "Completed", value: data.distribution.completed },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Welcome back, {user?.name?.split(" ")[0]}
          </motion.h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {isAdmin
              ? "Executive-grade visibility across projects, workload, and delivery risk."
              : "Your assignments, deadlines, and momentum — distilled."}
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1 border-primary/30 bg-primary/5">
          <Flame className="h-3.5 w-3.5 text-primary" />
          {data.scope === "admin" ? "Admin analytics" : "Personal workspace"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          delay={0}
          title="Projects"
          value={data.totals.projects}
          subtitle="Visible workspaces"
          icon={Layers}
        />
        <StatCard
          delay={0.05}
          title="Completed"
          value={data.totals.completedTasks}
          subtitle="Tasks shipped"
          icon={CheckCircle2}
        />
        <StatCard
          delay={0.1}
          title="Pending"
          value={data.totals.pendingTasks}
          subtitle="Still in motion"
          icon={Timer}
        />
        <StatCard
          delay={0.15}
          title="Overdue"
          value={data.totals.overdueTasks}
          subtitle="Needs attention"
          icon={CalendarClock}
          accent="border-red-500/20"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass border-border/60 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Productivity pulse
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Completed tasks per day · last 7 days
              </p>
            </div>
            {data.scope === "admin" ? (
              <Badge variant="secondary" className="gap-1">
                <ArrowUpRight className="h-3 w-3" />
                {data.velocity} closed · 14d
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="h-72 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.productivity}>
                <defs>
                  <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" className="stroke-border/50" />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card) / 0.95)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#fillCompleted)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Task mix</CardTitle>
            <p className="text-xs text-muted-foreground">Status distribution</p>
          </CardHeader>
          <CardContent className="flex h-72 flex-col items-center justify-center pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={4}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card) / 0.95)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              {pieData.map((p, i) => (
                <span key={p.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {p.name}: {p.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-72 pr-3">
              <ul className="space-y-4">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-muted text-center text-xs font-semibold leading-8">
                      {a.user.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className="leading-snug">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(a.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
                {!data.activity.length ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : null}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {data.scope === "admin" ? "Upcoming deadlines" : "Your queue"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {data.scope === "admin"
              ? data.upcomingDeadlines.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.project.name}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatDue(t.dueDate)}</p>
                      {t.assignee ? (
                        <p className="mt-0.5">{t.assignee.name}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              : data.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{t.title}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {priorityLabel(t.priority as TaskPriority)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.project.name}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {statusLabel(t.status as TaskStatus)} · {formatDue(t.dueDate)}
                    </p>
                  </div>
                ))}
            {data.scope === "admin" && !data.upcomingDeadlines.length ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            ) : null}
            {data.scope === "member" && !data.tasks.length ? (
              <p className="text-sm text-muted-foreground">No assignments yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {data.scope === "member" && data.insights?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.insights.map((ins, i) => (
            <motion.div
              key={ins.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="glass rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/5 p-5"
            >
              <p className="text-sm font-semibold">{ins.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{ins.detail}</p>
            </motion.div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
