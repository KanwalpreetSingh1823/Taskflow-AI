import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const projects = await prisma.project.findMany({
      where: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
      select: { id: true },
    });
    const ids = projects.map((p) => p.id);

    const where =
      projectId && ids.includes(projectId)
        ? { projectId }
        : { projectId: { in: ids } };

    const activity = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ activity });
  } catch (error) {
    return handleApiError(error);
  }
}
