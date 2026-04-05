/**
 * InboxInterceptor Service
 *
 * Service layer for the Shadow Inbox spam filter.
 * Wraps the pure interceptor logic from `src/interceptors/InboxInterceptor.ts`
 * and adds database persistence for shadow-dropped messages and primary inbox
 * delivery.
 *
 * Incoming SMTP/IMAP pings from non-verified sender domains (e.g. gmail.com,
 * yahoo.com) are immediately written to the `ShadowInbox` table and never
 * reach the user's primary inbox.
 */

import { prisma } from "../db";
import {
  shouldIntercept,
  sanitizeBody,
  type IncomingMessage,
  type InterceptResult,
} from "../interceptors/InboxInterceptor";

// Re-export pure helpers so callers can import from a single surface.
export {
  shouldIntercept,
  sanitizeBody,
  extractDomain,
  isValidEmail,
  getUnverifiedDomains,
  type IncomingMessage,
  type InterceptResult,
} from "../interceptors/InboxInterceptor";

// ─── Service-level result types ───────────────────────────────────────────────

export type WebhookOutcome =
  | { status: "intercepted"; reason: string; domain: string }
  | { status: "delivered"; messageId: string }
  | { status: "recipient_not_found" };

// ─── Service entrypoint ───────────────────────────────────────────────────────

/**
 * Processes an incoming email webhook message.
 *
 * 1. Runs the spam-domain interception check.
 * 2. If intercepted, persists the message to the `ShadowInbox` table and
 *    returns `{ status: "intercepted" }` — the primary inbox is never touched.
 * 3. Otherwise, looks up the recipient user and writes to `InboxMessage`.
 *
 * @param message - The raw incoming message from the SMTP/IMAP webhook.
 * @returns WebhookOutcome describing what happened.
 */
export async function processIncomingWebhook(
  message: IncomingMessage
): Promise<WebhookOutcome> {
  const intercept: InterceptResult = shouldIntercept(message);

  if (intercept.intercepted) {
    await prisma.shadowInbox.create({
      data: {
        senderEmail: message.senderEmail,
        recipientEmail: message.recipientEmail,
        subject: message.subject || "(no subject)",
        body: sanitizeBody(message.body || ""),
        domain: intercept.domain,
        reason: intercept.reason,
      },
    });

    return {
      status: "intercepted",
      reason: intercept.reason,
      domain: intercept.domain,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: message.recipientEmail },
  });

  if (!user) {
    return { status: "recipient_not_found" };
  }

  const created = await prisma.inboxMessage.create({
    data: {
      userId: user.id,
      senderEmail: message.senderEmail,
      subject: message.subject || "(no subject)",
      body: sanitizeBody(message.body || ""),
    },
  });

  return { status: "delivered", messageId: created.id };
}
