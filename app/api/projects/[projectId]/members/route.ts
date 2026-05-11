import { NextResponse } from "next/server";
import { ActivityType, Role } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { inviteMemberSchema } from "@/lib/validators";
import { requireAuth, requireProjectMember } from "@/lib/server-auth";
import { notifyUser } from "@/services/notifications";

type Params = { params: { projectId: string } };

export async function POST(request: Request, context: Params) {
  try {
    const { user } = await requireAuth();
    if (user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { projectId } = context.params;
    const res = await requireProjectMember(projectId, user.id);

    const raw = await readJson(request);
    const body = inviteMemberSchema.parse(raw);

    const invitee = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!invitee) {
      return NextResponse.json({ error: "User not found with that email" }, { status: 404 });
    }

    const exists = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: res.project.id, userId: invitee.id },
      },
    });
    if (exists) {
      return NextResponse.json({ error: "User already on project" }, { status: 409 });
    }

    await prisma.projectMember.create({
      data: { projectId: res.project.id, userId: invitee.id },
    });

    await logActivity({
      type: ActivityType.MEMBER_ADDED,
      title: `Added ${invitee.email} to ${res.project.name}`,
      userId: user.id,
      projectId: res.project.id,
      metadata: { email: invitee.email },
    });

    await notifyUser({
      userId: invitee.id,
      title: "Added to project",
      body: `${user.name} added you to ${res.project.name}.`,
      href: `/projects/${res.project.id}`,
    });

    const members = await prisma.projectMember.findMany({
      where: { projectId: res.project.id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true, role: true } },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}
