import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ActivityType, Role } from "@prisma/client";
import { authCookieOptions, hashPassword, signToken } from "@/lib/auth";
import { AUTH_COOKIE } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { handleApiError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { ApiError } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const raw = await readJson(request);
    const body = signupSchema.parse(raw);

    const exists = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (exists) throw new ApiError(409, "Email already registered");

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        role: Role.MEMBER,
      },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    cookies().set(AUTH_COOKIE, token, authCookieOptions());

    await logActivity({
      type: ActivityType.USER_LOGIN,
      title: `${user.name} created an account`,
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
