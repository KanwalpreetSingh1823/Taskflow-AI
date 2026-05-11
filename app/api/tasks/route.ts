import { NextResponse } from "next/server";
import { ActivityType, Role, TaskStatus } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { taskCreateSchema } from "@/lib/validators";
import { requireAuth, requireProjectAdmin } from "@/lib/server-auth";
import { notifyUser } from "@/services/notifications";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status") as TaskStatus | null;
    const priority = searchParams.get("priority");

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority: priority as never } : {}),
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth();
    if (user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const raw = await readJson(request);
    const body = taskCreateSchema.parse(raw);

    await requireProjectAdmin(body.projectId, user);

    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const task = await prisma.task.create({
      data: {
        projectId: body.projectId,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority ?? undefined,
        status: body.status ?? undefined,
        dueDate,
        assigneeId: body.assigneeId ?? null,
        createdById: user.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      type: ActivityType.TASK_CREATED,
      title: `Created task "${task.title}"`,
      userId: user.id,
      projectId: task.projectId,
      taskId: task.id,
    });

    if (task.assigneeId) {
      await notifyUser({
        userId: task.assigneeId,
        title: "New task assigned",
        body: `${user.name} assigned you "${task.title}".`,
        href: `/projects/${task.projectId}?task=${task.id}`,
      });
    }

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}
