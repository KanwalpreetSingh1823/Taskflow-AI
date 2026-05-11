import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { Role } from "@prisma/client";
import { AUTH_COOKIE } from "./constants";
import { prisma } from "./prisma";
import type { JwtPayload } from "./auth";
import { verifyToken } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requireAuth(): Promise<{ user: User; payload: JwtPayload }> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) throw new ApiError(401, "Unauthorized");
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, "Invalid session");
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new ApiError(401, "Unauthorized");
  return { user, payload };
}

export async function requireAdmin() {
  const ctx = await requireAuth();
  if (ctx.user.role !== Role.ADMIN) throw new ApiError(403, "Admin only");
  return ctx;
}

export async function getProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: true } },
    },
  });
  return project;
}

export async function requireProjectMember(projectId: string, userId: string) {
  const project = await getProjectAccess(projectId, userId);
  if (!project) throw new ApiError(404, "Project not found");
  const isAdminOwner = project.ownerId === userId;
  return { project, isOwner: isAdminOwner };
}

/** Platform admins with access to the project can manage tasks and settings. */
export async function requireProjectAdmin(projectId: string, user: User) {
  if (user.role !== Role.ADMIN) throw new ApiError(403, "Admin only");
  const project = await getProjectAccess(projectId, user.id);
  if (!project) throw new ApiError(404, "Project not found");
  return project;
}
