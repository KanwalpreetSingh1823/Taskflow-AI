import { NextResponse } from "next/server";
import { Role, TaskStatus } from "@prisma/client";
import { handleApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server-auth";

export async function GET() {
  try {
    const { user } = await requireAuth();
    const now = new Date();

    if (user.role === Role.ADMIN) {
      const projectIds = await prisma.project.findMany({
        where: {
          OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
        },
        select: { id: true },
      });
      const ids = projectIds.map((p) => p.id);

      const [
        totalProjects,
        tasks,
        completedTasks,
        activity,
        upcomingDeadlines,
      ] = await Promise.all([
        prisma.project.count({
          where: {
            OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
          },
        }),
        prisma.task.findMany({
          where: { projectId: { in: ids } },
          select: {
            id: true,
            status: true,
            dueDate: true,
            priority: true,
            title: true,
            projectId: true,
            updatedAt: true,
          },
        }),
        prisma.task.count({
          where: { projectId: { in: ids }, status: TaskStatus.COMPLETED },
        }),
        prisma.activityLog.findMany({
          where: { projectId: { in: ids } },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            projectId: { in: ids },
            dueDate: { gte: now },
            status: { not: TaskStatus.COMPLETED },
          },
          orderBy: { dueDate: "asc" },
          take: 6,
          include: {
            project: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        }),
      ]);

      const pending = tasks.filter((t) => t.status !== TaskStatus.COMPLETED).length;
      const overdue = tasks.filter(
        (t) =>
          t.dueDate &&
          t.status !== TaskStatus.COMPLETED &&
          new Date(t.dueDate) < now,
      ).length;

      const bucket = last7DaysBuckets(tasks);

      const distribution = {
        todo: tasks.filter((t) => t.status === TaskStatus.TODO).length,
        inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
        completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
      };

      const velocity =
        tasks.filter(
          (t) =>
            t.status === TaskStatus.COMPLETED &&
            t.updatedAt > new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14),
        ).length;

      return NextResponse.json({
        scope: "admin",
        totals: {
          projects: totalProjects,
          completedTasks,
          pendingTasks: pending,
          overdueTasks: overdue,
        },
        velocity,
        productivity: bucket,
        distribution,
        activity,
        upcomingDeadlines,
      });
    }

    const assignments = await prisma.task.findMany({
      where: { assigneeId: user.id },
      include: {
        project: {
          select: { id: true, name: true, deadline: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const completedTasks = assignments.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    ).length;
    const pendingTasks = assignments.filter(
      (t) => t.status !== TaskStatus.COMPLETED,
    ).length;
    const overdueTasks = assignments.filter(
      (t) =>
        t.dueDate &&
        t.status !== TaskStatus.COMPLETED &&
        new Date(t.dueDate) < now,
    ).length;

    const projectIds = Array.from(
      new Set(assignments.map((a) => a.projectId)),
    );

    const activity = await prisma.activityLog.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    const productivity = last7DaysBuckets(assignments);
    const distribution = {
      todo: assignments.filter((t) => t.status === TaskStatus.TODO).length,
      inProgress: assignments.filter((t) => t.status === TaskStatus.IN_PROGRESS)
        .length,
      completed: assignments.filter((t) => t.status === TaskStatus.COMPLETED).length,
    };

    return NextResponse.json({
      scope: "member",
      totals: {
        projects: projectIds.length,
        completedTasks,
        pendingTasks,
        overdueTasks,
      },
      productivity,
      distribution,
      tasks: assignments.slice(0, 12),
      activity,
      insights: buildInsights(assignments),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function last7DaysBuckets(
  tasks: { status: TaskStatus; updatedAt: Date }[],
): { day: string; completed: number }[] {
  const days: { day: string; completed: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const label = d.toISOString().slice(0, 10);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const completed = tasks.filter(
      (t) =>
        t.status === TaskStatus.COMPLETED &&
        t.updatedAt >= d &&
        t.updatedAt < next,
    ).length;
    days.push({
      day: label.slice(5),
      completed,
    });
  }
  return days;
}

function buildInsights(
  tasks: {
    status: TaskStatus;
    dueDate: Date | null;
    priority: string;
  }[],
) {
  const actionable = tasks.filter(
    (t) => t.status !== TaskStatus.COMPLETED && t.dueDate,
  );
  const urgent = actionable.filter((t) => t.priority === "HIGH").length;
  const soon = actionable.filter((t) => {
    if (!t.dueDate) return false;
    const diff = new Date(t.dueDate).getTime() - Date.now();
    return diff > 0 && diff < 1000 * 60 * 60 * 72;
  }).length;

  return [
    {
      title: "Focus window",
      detail:
        urgent > 0
          ? `${urgent} high priority assignments need attention.`
          : "No urgent priorities — maintain momentum on in-progress work.",
    },
    {
      title: "Upcoming cadence",
      detail:
        soon > 0
          ? `${soon} tasks due in the next 72 hours.`
          : "No deadlines in the next 72 hours.",
    },
  ];
}
