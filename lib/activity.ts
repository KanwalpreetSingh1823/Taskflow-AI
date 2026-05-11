import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type CreateActivityInput = {
  type: ActivityType;
  title: string;
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logActivity(input: CreateActivityInput) {
  return prisma.activityLog.create({
    data: {
      type: input.type,
      title: input.title,
      userId: input.userId,
      projectId: input.projectId ?? undefined,
      taskId: input.taskId ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  });
}
