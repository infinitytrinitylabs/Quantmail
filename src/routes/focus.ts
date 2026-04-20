/**
 * Focus Flow Routes
 *
 * REST API endpoints for the Focus Flow service.
 * Provides email batching, session management, and engagement tracking.
 */

import { FastifyPluginAsync } from "fastify";
import {
  createFocusSessions,
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  endFocusSession,
  trackEngagement,
  getEngagementMetrics,
  analyzeInteractionHistory,
  type FocusEmailMetadata,
  type FocusFlowConfig,
} from "../services/FocusFlow";
import { requireAuth } from "../middleware/authMiddleware";
import { prisma } from "../db";

export const focusFlowRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /focus/create-sessions
   *
   * Creates optimized focus sessions from user's inbox.
   */
  fastify.post(
    "/focus/create-sessions",
    {
      preHandler: requireAuth,
      schema: {
        description: "Create focus sessions from inbox emails",
        tags: ["focus"],
        body: {
          type: "object",
          properties: {
            maxEmailsPerBatch: { type: "number" },
            clusteringStrategy: { type: "string" },
            targetSessionDuration: { type: "number" },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      const config = request.body as FocusFlowConfig;

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        // Fetch user's email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (!user) {
          return reply.code(404).send({ error: "User not found" });
        }

        // Fetch unread inbox messages
        const messages = await prisma.inboxMessage.findMany({
          where: {
            userId,
          },
          orderBy: {
            receivedAt: "desc",
          },
          take: 100,
        });

        // Convert to FocusEmailMetadata
        const focusEmails: FocusEmailMetadata[] = messages.map((msg) => ({
          emailId: msg.id,
          subject: msg.subject,
          bodyPreview: msg.body.slice(0, 500),
          bodyLength: msg.body.length,
          from: msg.senderEmail,
          fromName: msg.senderEmail,
          receivedAt: msg.receivedAt.toISOString(),
          hasAttachments: false,
          attachmentCount: 0,
          isImportant: false,
          isUnread: true,
          labels: [],
          priority: "medium",
        }));

        const sessions = await createFocusSessions(user.email, focusEmails, config);
        return reply.send({ sessions });
      } catch (error) {
        fastify.log.error({ err: error }, "Focus session creation failed");
        return reply.code(500).send({
          error: "Focus session creation failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * POST /focus/start-session
   *
   * Starts a focus session.
   */
  fastify.post(
    "/focus/start-session",
    {
      preHandler: requireAuth,
      schema: {
        description: "Start a focus session",
        tags: ["focus"],
        body: {
          type: "object",
          required: ["sessionId"],
          properties: {
            sessionId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      const { sessionId } = request.body as { sessionId: string };

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (!user) {
          return reply.code(404).send({ error: "User not found" });
        }

        startFocusSession(user.email, sessionId);
        return reply.send({ success: true, sessionId });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to start session");
        return reply.code(500).send({
          error: "Failed to start session",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * POST /focus/track-engagement
   *
   * Tracks user engagement during focus session.
   */
  fastify.post(
    "/focus/track-engagement",
    {
      preHandler: requireAuth,
      schema: {
        description: "Track engagement during focus session",
        tags: ["focus"],
        body: {
          type: "object",
          required: ["sessionId", "emailId", "action", "timeSpentSeconds"],
          properties: {
            sessionId: { type: "string" },
            emailId: { type: "string" },
            action: { type: "string" },
            timeSpentSeconds: { type: "number" },
          },
        },
      },
    },
    async (request, reply) => {
      const { sessionId, emailId, action, timeSpentSeconds } = request.body as {
        sessionId: string;
        emailId: string;
        action: "opened" | "responded" | "archived" | "skipped";
        timeSpentSeconds: number;
      };

      try {
        trackEngagement(sessionId, emailId, action, timeSpentSeconds);
        const metrics = getEngagementMetrics(sessionId);
        return reply.send({ success: true, metrics });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to track engagement");
        return reply.code(500).send({
          error: "Failed to track engagement",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * GET /focus/metrics/:sessionId
   *
   * Gets engagement metrics for a session.
   */
  fastify.get(
    "/focus/metrics/:sessionId",
    {
      preHandler: requireAuth,
      schema: {
        description: "Get engagement metrics for a session",
        tags: ["focus"],
        params: {
          type: "object",
          required: ["sessionId"],
          properties: {
            sessionId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };

      try {
        const metrics = getEngagementMetrics(sessionId);
        if (!metrics) {
          return reply.code(404).send({ error: "Session not found" });
        }
        return reply.send(metrics);
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to get metrics");
        return reply.code(500).send({
          error: "Failed to get metrics",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * POST /focus/end-session
   *
   * Ends a focus session.
   */
  fastify.post(
    "/focus/end-session",
    {
      preHandler: requireAuth,
      schema: {
        description: "End a focus session",
        tags: ["focus"],
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (!user) {
          return reply.code(404).send({ error: "User not found" });
        }

        const metrics = endFocusSession(user.email);
        return reply.send({ success: true, metrics });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to end session");
        return reply.code(500).send({
          error: "Failed to end session",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * GET /focus/interaction-history
   *
   * Analyzes user's interaction history.
   */
  fastify.get(
    "/focus/interaction-history",
    {
      preHandler: requireAuth,
      schema: {
        description: "Get user interaction history analysis",
        tags: ["focus"],
        querystring: {
          type: "object",
          properties: {
            lookbackDays: { type: "number" },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as any).user?.userId;
      const { lookbackDays } = request.query as { lookbackDays?: number };

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (!user) {
          return reply.code(404).send({ error: "User not found" });
        }

        const patterns = await analyzeInteractionHistory(user.email, lookbackDays);
        return reply.send({ patterns: Array.from(patterns.values()) });
      } catch (error) {
        fastify.log.error({ err: error }, "Failed to analyze interaction history");
        return reply.code(500).send({
          error: "Failed to analyze interaction history",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
};
