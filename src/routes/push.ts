import { FastifyInstance } from "fastify";
import { prisma } from "../db";
import {
  NotificationStatus,
  type PushNotification,
} from "../generated/prisma/client";
import {
  registerDeviceToken,
  sweepAndAggress,
} from "../services/pushAggressor";
import {
  PushRegisterBodySchema,
  PushChallengeCreateBodySchema,
} from "../validation/schemas";

export async function pushRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /push/register
   * Registers a device push token for a user.
   */
  app.post<{
    Body: { userId: string; token: string; platform: string };
  }>("/push/register", async (request, reply) => {
    const { userId, token, platform } = PushRegisterBodySchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    await registerDeviceToken({ userId, token, platform });
    return reply.code(201).send({ status: "registered", token });
  });

  /**
   * GET /push/queue/:userId
   * Returns queued/dispatched push notifications for a user.
   */
  app.get<{
    Params: { userId: string };
  }>("/push/queue/:userId", async (request, reply) => {
    const { userId } = request.params;
    const queue: PushNotification[] = await prisma.pushNotification.findMany({
      where: {
        userId,
        status: {
          in: [NotificationStatus.QUEUED, NotificationStatus.DISPATCHED],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ queue });
  });

  /**
   * POST /push/challenge/create
   * Creates a new liveness challenge for push aggressor flow.
   */
  app.post<{
    Body: {
      userId: string;
      ssoToken?: string;
      quantadsTarget?: string;
      quantchatTitle?: string;
      quantchatBody?: string;
      expiresInMinutes?: number;
    };
  }>("/push/challenge/create", async (request, reply) => {
    const { userId, ssoToken, quantadsTarget, quantchatTitle, quantchatBody, expiresInMinutes } =
      PushChallengeCreateBodySchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    const expiresAt = new Date(Date.now() + (expiresInMinutes ?? 180) * 60_000);

    const challenge = await prisma.livenessChallenge.create({
      data: {
        userId,
        ssoToken: ssoToken || null,
        quantadsTarget:
          quantadsTarget || "quantads://campaign/identity-check",
        quantchatTitle: quantchatTitle || "Quantchat SDK Warning",
        quantchatBody:
          quantchatBody ||
          "Biometric liveness token ignored. Open to resolve.",
        expiresAt,
      },
    });

    return reply.code(201).send({ challenge });
  });

  /**
   * GET /push/challenge/:challengeId/quantads
   * Returns QuantAds integration data for a challenge.
   */
  app.get<{
    Params: { challengeId: string };
  }>("/push/challenge/:challengeId/quantads", async (request, reply) => {
    const { challengeId } = request.params;
    const challenge = await prisma.livenessChallenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        userId: true,
        quantadsTarget: true,
        quantchatTitle: true,
        quantchatBody: true,
        status: true,
      },
    });

    if (!challenge) {
      return reply.code(404).send({ error: "Challenge not found" });
    }

    return reply.send({
      challengeId,
      quantadsTarget: challenge.quantadsTarget,
      bannerTitle: challenge.quantchatTitle,
      bannerBody: challenge.quantchatBody,
      status: challenge.status,
    });
  });

  /**
   * POST /push/ack/:notificationId
   * Acknowledges a push notification.
   */
  app.post<{
    Params: { notificationId: string };
  }>("/push/ack/:notificationId", async (request, reply) => {
    const { notificationId } = request.params;
    const notification = await prisma.pushNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return reply.code(404).send({ error: "Notification not found" });
    }

    await prisma.pushNotification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });

    return reply.send({ status: "acknowledged" });
  });

  /**
   * POST /push/aggressor/run
   * Manually triggers the push aggressor sweep.
   */
  app.post("/push/aggressor/run", async (_request, reply) => {
    const scanned = await sweepAndAggress();
    return reply.send({ scanned });
  });
}
