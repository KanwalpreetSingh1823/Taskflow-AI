import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireProjectMember } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuth();
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    await requireProjectMember(projectId, user.id);

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
    });

    return NextResponse.json({
      users: members.map((m) => m.user),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
