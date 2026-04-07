import { FastifyInstance } from "fastify";
import { prisma } from "../db";

function toDateTime(date?: string, time?: string): Date | undefined {
  if (!date) return undefined;
  return new Date(time ? `${date}T${time}` : date);
}

export async function calendarRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { userId: string } }>("/calendar/:userId", async (request, reply) => {
    const { userId } = request.params;
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { startAt: "asc" },
    });
    return reply.send({ events });
  });

  app.post<{
    Body: {
      userId: string;
      title: string;
      description?: string;
      startAt?: string;
      endAt?: string;
      date?: string;
      time?: string;
    };
  }>("/calendar", async (request, reply) => {
    const { userId, title, description = "", startAt, endAt, date, time } = request.body;

    const derivedStartAt = startAt ?? toDateTime(date, time)?.toISOString();
    const derivedEndAt = endAt ?? (derivedStartAt ? new Date(new Date(derivedStartAt).getTime() + 60 * 60 * 1000).toISOString() : undefined);

    if (!userId || !title || !derivedStartAt || !derivedEndAt) {
      return reply.code(400).send({ error: "userId, title, and a valid schedule are required" });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        description,
        startAt: new Date(derivedStartAt),
        endAt: new Date(derivedEndAt),
      },
    });

    return reply.code(201).send({ event });
  });

  app.put<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      startAt?: string;
      endAt?: string;
      date?: string;
      time?: string;
    };
  }>("/calendar/:id", async (request, reply) => {
    const { id } = request.params;
    const { title, description, startAt, endAt, date, time } = request.body;

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "Event not found" });
    }

    const nextStartAt = startAt ?? toDateTime(date, time)?.toISOString();
    const nextEndAt = endAt ?? (nextStartAt ? new Date(new Date(nextStartAt).getTime() + 60 * 60 * 1000).toISOString() : undefined);

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(nextStartAt !== undefined && { startAt: new Date(nextStartAt) }),
        ...(nextEndAt !== undefined && { endAt: new Date(nextEndAt) }),
      },
    });

    return reply.send({ event });
  });

  app.delete<{ Params: { id: string } }>("/calendar/:id", async (request, reply) => {
    const { id } = request.params;

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "Event not found" });
    }

    await prisma.calendarEvent.delete({ where: { id } });
    return reply.send({ status: "deleted" });
  });
}
