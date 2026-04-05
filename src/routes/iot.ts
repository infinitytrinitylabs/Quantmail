import { FastifyInstance } from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "../db";
import {
  silenceAlarmFromDashboardPhysicalLogin,
  triggerSynchronizedWebBluetoothAlarm,
} from "../services/criticalAlarmService";
import {
  IotDeviceRegisterBodySchema,
  IotAlarmTriggerBodySchema,
  IotPhysicalLoginBodySchema,
  IotAlarmSilenceBodySchema,
} from "../validation/schemas";

const MILLISECONDS_PER_MINUTE = 60_000;
const MIN_PHYSICAL_SESSION_MINUTES = 1;
const MAX_PHYSICAL_SESSION_MINUTES = 60;
const DEVICE_PROOF_HMAC_SECRET =
  process.env["DEVICE_PROOF_HMAC_SECRET"] ||
  "quantmail-device-proof-dev-secret";

function deriveDeviceProof(
  userId: string,
  dashboardOrigin: string,
  timestamp: number
): string {
  return createHmac("sha256", DEVICE_PROOF_HMAC_SECRET)
    .update(`${userId}:${dashboardOrigin}:${timestamp}`)
    .digest("hex");
}

function verifyDeviceProof(
  proof: string,
  userId: string,
  dashboardOrigin: string,
  timestamp: number
): boolean {
  const expected = deriveDeviceProof(userId, dashboardOrigin, timestamp);
  try {
    return timingSafeEqual(Buffer.from(proof), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function iotRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /iot/device/register
   * Registers a connected IoT device for alarm dispatching.
   */
  app.post<{
    Body: {
      userId: string;
      deviceName: string;
      platform: string;
      connectionType?: string;
      endpointRef: string;
    };
  }>("/iot/device/register", async (request, reply) => {
    const { userId, deviceName, platform, connectionType, endpointRef } =
      IotDeviceRegisterBodySchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    const device = await prisma.connectedIoTDevice.upsert({
      where: {
        device_unique_identifier: {
          userId,
          endpointRef,
          platform,
        },
      },
      update: { deviceName, connectionType: connectionType || "WebBluetooth" },
      create: {
        userId,
        deviceName,
        platform,
        connectionType: connectionType || "WebBluetooth",
        endpointRef,
      },
    });

    return reply.code(201).send({ device });
  });

  /**
   * POST /iot/alarm/trigger
   * Manually triggers a synchronized alarm across all user devices.
   */
  app.post<{
    Body: {
      userId: string;
      source: string;
      subject: string;
      body: string;
    };
  }>("/iot/alarm/trigger", async (request, reply) => {
    const { userId, source, subject, body } =
      IotAlarmTriggerBodySchema.parse(request.body);

    const alarm = await triggerSynchronizedWebBluetoothAlarm({
      userId,
      source,
      subject,
      body,
    });

    return reply.code(201).send(alarm);
  });

  /**
   * POST /iot/dashboard/physical-login
   * Registers a physical dashboard login session for alarm silencing.
   */
  app.post<{
    Body: {
      userId: string;
      dashboardOrigin: string;
      deviceProof: string;
      proofTimestamp: number;
      sessionMinutes?: number;
    };
  }>("/iot/dashboard/physical-login", async (request, reply) => {
    const { userId, dashboardOrigin, deviceProof, proofTimestamp, sessionMinutes } =
      IotPhysicalLoginBodySchema.parse(request.body);

    if (!verifyDeviceProof(deviceProof, userId, dashboardOrigin, proofTimestamp)) {
      return reply.code(403).send({ error: "INVALID_DEVICE_PROOF" });
    }

    const clampedSessionMinutes = Math.max(
      MIN_PHYSICAL_SESSION_MINUTES,
      Math.min(MAX_PHYSICAL_SESSION_MINUTES, sessionMinutes ?? 15)
    );

    const session = await prisma.dashboardPhysicalLogin.create({
      data: {
        userId,
        dashboardOrigin,
        loginMethod: "PHYSICAL",
        deviceProof,
        expiresAt: new Date(
          Date.now() + clampedSessionMinutes * MILLISECONDS_PER_MINUTE
        ),
      },
    });

    return reply.code(201).send({
      status: "physical_login_verified",
      dashboardSessionId: session.id,
      expiresAt: session.expiresAt,
    });
  });

  /**
   * POST /iot/alarm/silence
   * Silences an active alarm using a physical dashboard login session.
   */
  app.post<{
    Body: {
      userId: string;
      alertId: string;
      dashboardSessionId: string;
      silenceChallenge: string;
    };
  }>("/iot/alarm/silence", async (request, reply) => {
    const { userId, alertId, dashboardSessionId, silenceChallenge } =
      IotAlarmSilenceBodySchema.parse(request.body);

    const result = await silenceAlarmFromDashboardPhysicalLogin({
      userId,
      alertId,
      dashboardSessionId,
      silenceChallenge,
    });

    if (!result.silenced) {
      const isAuthError =
        result.reason === "PHYSICAL_DASHBOARD_LOGIN_REQUIRED";
      return reply.code(isAuthError ? 403 : 404).send({
        error: result.reason,
      });
    }

    return reply.send({
      status: "silenced",
      alarmSilencedBy: "physical_dashboard_login",
    });
  });
}
