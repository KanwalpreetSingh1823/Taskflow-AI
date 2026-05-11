import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validators";
import { ApiError, requireAuth } from "@/lib/server-auth";
import { notifyUser } from "@/services/notifications";

type Params = { params: { taskId: string } };

export async function GET(_request: Request, context: Params) {
  try {
    const { user } = await requireAuth();
    const { taskId } = context.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
    if (!task) throw new ApiError(404, "Task not found");

    const access = await prisma.project.findFirst({
      where: {
        id: task.projectId,
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    });
    if (!access) throw new ApiError(404, "Task not found");

    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: Params) {
  try {
    const { user } = await requireAuth();
    const { taskId } = context.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
    if (!task) throw new ApiError(404, "Task not found");

    const access = await prisma.project.findFirst({
      where: {
        id: task.projectId,
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    });
    if (!access) throw new ApiError(404, "Task not found");

    const raw = await readJson(request);
    const body = commentSchema.parse(raw);

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: user.id,
        content: body.content,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    await logActivity({
      type: ActivityType.COMMENT_ADDED,
      title: `${user.name} commented on "${task.title}"`,
      userId: user.id,
      projectId: task.projectId,
      taskId: task.id,
    });

    const recipients = new Set<string>();
    if (task.assigneeId && task.assigneeId !== user.id) recipients.add(task.assigneeId);
    if (task.createdById !== user.id) recipients.add(task.createdById);

    await Promise.all(
      Array.from(recipients).map((uid) =>
        notifyUser({
          userId: uid,
          title: "New comment",
          body: `${user.name} on "${task.title}": ${body.content.slice(0, 120)}${body.content.length > 120 ? "…" : ""}`,
          href: `/projects/${task.projectId}?task=${task.id}`,
        }),
      ),
    );

    return NextResponse.json({ comment });
  } catch (error) {
    return handleApiError(error);
  }
}
