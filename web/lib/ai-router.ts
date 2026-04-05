import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AIProvider = "openai" | "anthropic" | "gemini" | "custom";

export interface ResolvedKey {
  provider: AIProvider;
  apiKey: string;
  source: "user" | "admin";
}

/**
 * Resolves the API key to use for AI requests.
 *
 * Priority order:
 * 1. User's own key for the requested provider (BYOK – your cost = $0)
 * 2. Admin global key for the requested provider
 * 3. Throws if no key is found
 */
export async function resolveAIKey(
  provider: AIProvider = "openai"
): Promise<ResolvedKey> {
  const session = await auth();

  if (session?.user?.id) {
    const userKey = await prisma.apiKey.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
    });

    if (userKey?.keyValue) {
      return { provider, apiKey: userKey.keyValue, source: "user" };
    }
  }

  // Fall back to admin global key
  const adminKey = await prisma.adminSetting.findUnique({
    where: { key: `api_key_${provider}` },
  });

  if (adminKey?.value) {
    return { provider, apiKey: adminKey.value, source: "admin" };
  }

  throw new Error(
    `No API key found for provider "${provider}". Please add your key in Settings.`
  );
}

/**
 * Returns the user ID from the current session, or null if not authenticated.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
