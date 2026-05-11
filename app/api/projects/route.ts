import { NextResponse } from "next/server";
import { ActivityType, Role } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { projectCreateSchema } from "@/lib/validators";
import { requireAuth } from "@/lib/server-auth";

export async function GET() {
  try {
    const { user } = await requireAuth();
    const projects = await prisma.project.findMany({
      where: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            dueDate: true,
            priority: true,
            assigneeId: true,
          },
        },
      },
    });

    const enriched = projects.map((p) => {
      const total = p.tasks.length;
      const completed = p.tasks.filter((t) => t.status === "COMPLETED").length;
      const overdue = p.tasks.filter(
        (t) =>
          t.dueDate &&
          t.status !== "COMPLETED" &&
          new Date(t.dueDate) < new Date(),
      ).length;
      return {
        ...p,
        stats: { total, completed, overdue, progress: total ? completed / total : 0 },
      };
    });

    return NextResponse.json({ projects: enriched });
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
    const body = projectCreateSchema.parse(raw);

    const deadline = body.deadline ? new Date(body.deadline) : null;

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        deadline,
        ownerId: user.id,
        members: {
          create: [{ userId: user.id }],
        },
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
      type: ActivityType.PROJECT_CREATED,
      title: `Created project "${project.name}"`,
      userId: user.id,
      projectId: project.id,
    });

    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}
