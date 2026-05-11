import { NextResponse } from "next/server";
import { ActivityType, Role } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { projectUpdateSchema } from "@/lib/validators";
import { requireAuth, requireProjectMember } from "@/lib/server-auth";

type Params = { params: { projectId: string } };

export async function GET(_request: Request, context: Params) {
  try {
    const { user } = await requireAuth();
    const { projectId } = context.params;
    const res = await requireProjectMember(projectId, user.id);
    const project = await prisma.project.findUnique({
      where: { id: res.project.id },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true, role: true } },
          },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Params) {
  try {
    const { user } = await requireAuth();
    if (user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { projectId } = context.params;
    const res = await requireProjectMember(projectId, user.id);
    const raw = await readJson(request);
    const body = projectUpdateSchema.parse(raw);

    const deadline =
      body.deadline === undefined
        ? undefined
        : body.deadline
          ? new Date(body.deadline)
          : null;

    const project = await prisma.project.update({
      where: { id: res.project.id },
      data: {
        name: body.name ?? undefined,
        description:
          body.description === undefined ? undefined : body.description ?? null,
        deadline,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    await logActivity({
      type: ActivityType.PROJECT_UPDATED,
      title: `Updated project "${project.name}"`,
      userId: user.id,
      projectId: project.id,
    });

    return NextResponse.json({ project });
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
    const { projectId } = context.params;
    const res = await requireProjectMember(projectId, user.id);
    if (res.project.ownerId !== user.id) {
      return NextResponse.json({ error: "Only owner can delete" }, { status: 403 });
    }
    await prisma.project.delete({ where: { id: res.project.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
