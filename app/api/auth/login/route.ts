import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ActivityType } from "@prisma/client";
import { authCookieOptions, signToken, verifyPassword } from "@/lib/auth";
import { AUTH_COOKIE } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { ApiError } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const raw = await readJson(request);
    const body = loginSchema.parse(raw);

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password");
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    cookies().set(AUTH_COOKIE, token, authCookieOptions());

    await logActivity({
      type: ActivityType.USER_LOGIN,
      title: `${user.name} signed in`,
      userId: user.id,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
