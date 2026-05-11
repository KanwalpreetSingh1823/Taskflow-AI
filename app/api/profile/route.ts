import { NextResponse } from "next/server";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validators";
import { requireAuth } from "@/lib/server-auth";

export async function PATCH(request: Request) {
  try {
    const { user } = await requireAuth();
    const raw = await readJson(request);
    const body = profileUpdateSchema.parse(raw);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: body.name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
