import { prisma } from "@/lib/prisma";

export async function notifyUser(input: {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  });
}
