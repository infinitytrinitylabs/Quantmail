/**
 * Webhook Routes
 *
 * REST API for managing webhook endpoint subscriptions.
 * Admin-protected registration; open verification endpoint for receivers.
 */

import { FastifyInstance } from "fastify";
import {
  registerWebhookEndpoint,
  verifyWebhookSignature,
  type WebhookEventType,
} from "../webhooks/webhookService";
import { requireAdmin } from "../middleware/authMiddleware";
import { prisma } from "../db";

/** Simple in-memory rate limiter for the webhook verify endpoint. */
const verifyRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const VERIFY_RATE_LIMIT_WINDOW_MS = 60_000;
const VERIFY_RATE_LIMIT_MAX = 30;

function checkVerifyRateLimit(ip: string): boolean {
  const now = Date.now();

  // Periodically prune expired entries to prevent unbounded map growth.
  if (verifyRateLimitMap.size > 10_000) {
    for (const [key, val] of verifyRateLimitMap) {
      if (val.resetAt < now) verifyRateLimitMap.delete(key);
    }
  }

  const entry = verifyRateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    verifyRateLimitMap.set(ip, { count: 1, resetAt: now + VERIFY_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= VERIFY_RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /webhooks/register
   * Registers a new webhook endpoint. Requires admin authorization.
   */
  app.post<{
    Body: { url: string; secret: string; events: WebhookEventType[] };
  }>("/webhooks/register", {
    preHandler: requireAdmin,
    handler: async (request, reply) => {
      const { url, secret, events } = request.body;

      if (!url || !secret) {
        return reply.code(400).send({ error: "url and secret required" });
      }

      try {
        new URL(url);
      } catch {
        return reply.code(400).send({ error: "Invalid URL format" });
      }

      const endpoint = await registerWebhookEndpoint(
        url,
        secret,
        events || []
      );

      return reply.code(201).send({ endpoint });
    },
  });

  /**
   * GET /webhooks
   * Lists all registered webhook endpoints. Requires admin authorization.
   */
  app.get("/webhooks", {
    preHandler: requireAdmin,
    handler: async (_request, reply) => {
      const endpoints = await prisma.webhookEndpoint.findMany({
        select: {
          id: true,
          url: true,
          events: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        endpoints: endpoints.map((ep) => ({
          ...ep,
          events: JSON.parse(ep.events) as string[],
        })),
      });
    },
  });

  /**
   * DELETE /webhooks/:id
   * Deactivates a webhook endpoint. Requires admin authorization.
   */
  app.delete<{ Params: { id: string } }>("/webhooks/:id", {
    preHandler: requireAdmin,
    handler: async (request, reply) => {
      const { id } = request.params;

      const endpoint = await prisma.webhookEndpoint.findUnique({
        where: { id },
      });

      if (!endpoint) {
        return reply.code(404).send({ error: "Webhook endpoint not found" });
      }

      await prisma.webhookEndpoint.update({
        where: { id },
        data: { active: false },
      });

      return reply.send({ status: "deactivated", id });
    },
  });

  /**
   * POST /webhooks/verify
   * Utility endpoint for receivers to verify the signature of an incoming webhook.
   */
  app.post<{
    Body: { payload: string; signature: string; secret: string };
  }>("/webhooks/verify", async (request, reply) => {
    if (!checkVerifyRateLimit(request.ip)) {
      return reply.code(429).send({ error: "Rate limit exceeded" });
    }

    const { payload, signature, secret } = request.body;

    if (!payload || !signature || !secret) {
      return reply
        .code(400)
        .send({ error: "payload, signature, and secret required" });
    }

    const valid = verifyWebhookSignature(payload, signature, secret);
    return reply.send({ valid });
  });
}
