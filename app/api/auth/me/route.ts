import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http";
import { requireAuth } from "@/lib/server-auth";

export async function GET() {
  try {
    const { user } = await requireAuth();
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
