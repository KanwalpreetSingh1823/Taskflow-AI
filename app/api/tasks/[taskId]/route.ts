import { NextResponse } from "next/server";
import { ActivityType, Role } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { taskUpdateSchema } from "@/lib/validators";
import { ApiError, requireAuth, requireProjectAdmin } from "@/lib/server-auth";
import { notifyUser } from "@/services/notifications";

type Params = { params: { taskId: string } };

async function loadTask(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
}

export async function PATCH(request: Request, context: Params) {
  try {
    const { user } = await requireAuth();
    const { taskId } = context.params;
    const task = await loadTask(taskId);
    if (!task) throw new ApiError(404, "Task not found");

    await prisma.project.findFirstOrThrow({
      where: {
        id: task.projectId,
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    });

    const raw = await readJson(request);
    const body = taskUpdateSchema.parse(raw);

    if (user.role === Role.ADMIN) {
      await requireProjectAdmin(task.projectId, user);

      const dueDate =
        body.dueDate === undefined
          ? undefined
          : body.dueDate
            ? new Date(body.dueDate)
            : null;

      const prevAssignee = task.assigneeId;
      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          title: body.title ?? undefined,
          description:
            body.description === undefined ? undefined : body.description ?? null,
          priority: body.priority ?? undefined,
          status: body.status ?? undefined,
          dueDate,
          assigneeId:
            body.assigneeId === undefined ? undefined : body.assigneeId ?? null,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      });

      if (body.status && body.status !== task.status) {
        await logActivity({
          type: ActivityType.TASK_STATUS_CHANGED,
          title: `Moved "${updated.title}" to ${formatStatus(body.status)}`,
          userId: user.id,
          projectId: task.projectId,
          taskId: task.id,
          metadata: { from: task.status, to: body.status },
        });
      } else if (
        body.title ||
        body.description !== undefined ||
        body.priority ||
        body.dueDate !== undefined ||
        body.assigneeId !== undefined
      ) {
        await logActivity({
          type: ActivityType.TASK_UPDATED,
          title: `Updated task "${updated.title}"`,
          userId: user.id,
          projectId: task.projectId,
          taskId: task.id,
        });
      }

      if (
        updated.assigneeId &&
        updated.assigneeId !== prevAssignee &&
        updated.assigneeId !== user.id
      ) {
        await notifyUser({
          userId: updated.assigneeId,
          title: "Task assignment",
          body: `${user.name} assigned you "${updated.title}".`,
          href: `/projects/${task.projectId}?task=${task.id}`,
        });
      }

      return NextResponse.json({ task: updated });
    }

    if (task.assigneeId !== user.id) {
      throw new ApiError(403, "You can only update tasks assigned to you");
    }

    const keys = Object.keys(body).filter(
      (k) => body[k as keyof typeof body] !== undefined,
    );
    const forbidden = keys.filter((k) => k !== "status");
    if (forbidden.length || body.status === undefined) {
      throw new ApiError(403, "Members may only update task status");
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: body.status },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      type: ActivityType.TASK_STATUS_CHANGED,
      title: `${user.name} moved "${updated.title}" to ${formatStatus(body.status)}`,
      userId: user.id,
      projectId: task.projectId,
      taskId: task.id,
      metadata: { from: task.status, to: body.status },
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Params) {
  try {
    const { user } = await requireAuth();
    if (user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { taskId } = context.params;
    const task = await loadTask(taskId);
    if (!task) throw new ApiError(404, "Task not found");

    await requireProjectAdmin(task.projectId, user);

    await prisma.task.delete({ where: { id: task.id } });

    await logActivity({
      type: ActivityType.TASK_DELETED,
      title: `Deleted task "${task.title}"`,
      userId: user.id,
      projectId: task.projectId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase();
}
