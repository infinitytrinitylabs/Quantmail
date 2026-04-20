/**
 * Intent Recognition Routes
 *
 * REST API endpoints for the Intent Recognition service.
 * Provides email analysis, intent classification, and auto-draft generation.
 */

import { FastifyPluginAsync } from "fastify";
import {
  classifyIntent,
  generateResponseDraft,
  analyzeThread,
  extractActionItems,
  buildUserProfile,
  type EmailMetadata,
  type ResponseContext,
  type IntentRecognitionConfig,
} from "../services/IntentRecognition";
import { requireAuth } from "../middleware/authMiddleware";
import { prisma } from "../db";

export const intentRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /intent/classify
   *
   * Classifies the intent of an incoming email.
   */
  fastify.post(
    "/intent/classify",
    {
      preHandler: requireAuth,
      schema: {
        description: "Classify email intent and extract metadata",
        tags: ["intent"],
        body: {
          type: "object",
          required: ["emailId", "subject", "body", "from", "fromName"],
          properties: {
            emailId: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            from: { type: "string" },
            fromName: { type: "string" },
            receivedAt: { type: "string" },
            threadId: { type: "string" },
            relationship: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const emailMetadata = request.body as EmailMetadata;

      try {
        const analysis = await classifyIntent(emailMetadata);
        return reply.send(analysis);
      } catch (error) {
        fastify.log.error({ err: error }, "Intent classification failed");
        return reply.code(500).send({
          error: "Intent classification failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * POST /intent/generate-draft
   *
   * Generates an AI-powered draft response for an email.
   */
  fastify.post(
    "/intent/generate-draft",
    {
      preHandler: requireAuth,
      schema: {
        description: "Generate draft email response using AI",
        tags: ["intent"],
        body: {
          type: "object",
          required: ["emailId"],
          properties: {
            emailId: { type: "string" },
            additionalInstructions: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { emailId, additionalInstructions } = request.body as {
        emailId: string;
        additionalInstructions?: string;
      };
      const userId = (request as any).user?.userId;

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        // Fetch email from database
        const inboxMessage = await prisma.inboxMessage.findFirst({
          where: { id: emailId, userId },
          include: { user: true },
        });

        if (!inboxMessage) {
          return reply.code(404).send({ error: "Email not found" });
        }

        const emailMetadata: EmailMetadata = {
          emailId: inboxMessage.id,
          subject: inboxMessage.subject,
          body: inboxMessage.body,
          from: inboxMessage.senderEmail,
          fromName: inboxMessage.senderEmail,
          receivedAt: inboxMessage.receivedAt.toISOString(),
        };

        // Classify intent first
        const analysis = await classifyIntent(emailMetadata);

        // Build user profile from past emails
        const sentEmails = await prisma.email.findMany({
          where: { userId },
          orderBy: { date: "desc" },
          take: 20,
          select: {
            subject: true,
            body: true,
            date: true,
            recipientId: true,
          },
        });

        const userProfile = buildUserProfile(
          inboxMessage.user.email,
          sentEmails.map((e) => ({
            subject: e.subject,
            body: e.body,
            from: inboxMessage.user.email,
            timestamp: e.date.toISOString(),
            isFromUser: true,
          }))
        );

        const context: ResponseContext = {
          email: emailMetadata,
          analysis,
          userProfile,
          additionalInstructions,
        };

        const draft = await generateResponseDraft(context);
        return reply.send(draft);
      } catch (error) {
        fastify.log.error({ err: error }, "Draft generation failed");
        return reply.code(500).send({
          error: "Draft generation failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * POST /intent/extract-actions
   *
   * Extracts action items from email body.
   */
  fastify.post(
    "/intent/extract-actions",
    {
      preHandler: requireAuth,
      schema: {
        description: "Extract action items from email body",
        tags: ["intent"],
        body: {
          type: "object",
          required: ["body"],
          properties: {
            body: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { body } = request.body as { body: string };

      try {
        const actions = await extractActionItems(body);
        return reply.send({ actions });
      } catch (error) {
        fastify.log.error({ err: error }, "Action extraction failed");
        return reply.code(500).send({
          error: "Action extraction failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
};
