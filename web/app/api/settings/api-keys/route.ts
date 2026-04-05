import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { provider, keyValue } = await request.json();

    if (!provider || !keyValue) {
      return NextResponse.json(
        { error: "provider and keyValue are required" },
        { status: 400 }
      );
    }

    const allowedProviders = ["openai", "anthropic", "gemini", "custom"];
    if (!allowedProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    await prisma.apiKey.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
      update: { keyValue },
      create: {
        userId: session.user.id,
        provider,
        keyValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: { provider: true, updatedAt: true },
  });

  return NextResponse.json({ keys });
}
