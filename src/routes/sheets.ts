import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function sheetsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { userId: string } }>("/sheets/:userId", async (request, reply) => {
    const { userId } = request.params;
    const sheets = await prisma.sheet.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return reply.send({ sheets });
  });

  app.get<{ Params: { userId: string; id: string } }>("/sheets/:userId/:id", async (request, reply) => {
    const { userId, id } = request.params;
    const sheet = await prisma.sheet.findFirst({ where: { id, userId } });
    if (!sheet) {
      return reply.code(404).send({ error: "Sheet not found" });
    }
    return reply.send({ sheet });
  });

  app.post<{
    Body: { userId: string; title: string; data?: string; dataJson?: string };
  }>("/sheets", async (request, reply) => {
    const { userId, title, data, dataJson } = request.body;

    if (!userId || !title) {
      return reply.code(400).send({ error: "userId and title are required" });
    }

    const sheet = await prisma.sheet.create({
      data: { userId, title, data: data ?? dataJson ?? "[]" },
    });
    return reply.code(201).send({ sheet });
  });

  app.put<{
    Params: { id: string };
    Body: { userId?: string; title?: string; data?: string; dataJson?: string };
  }>("/sheets/:id", async (request, reply) => {
    const { id } = request.params;
    const { userId, title, data, dataJson } = request.body;

    const existing = userId
      ? await prisma.sheet.findFirst({ where: { id, userId } })
      : await prisma.sheet.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "Sheet not found" });
    }

    const sheet = await prisma.sheet.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(data !== undefined && { data }),
        ...(dataJson !== undefined && { data: dataJson }),
      },
    });

    return reply.send({ sheet });
  });

  app.delete<{ Params: { id: string }; Body: { userId?: string } }>("/sheets/:id", async (request, reply) => {
    const { id } = request.params;
    const userId = request.body?.userId;

    const existing = userId
      ? await prisma.sheet.findFirst({ where: { id, userId } })
      : await prisma.sheet.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "Sheet not found" });
    }

    await prisma.sheet.delete({ where: { id } });
    return reply.send({ status: "deleted" });
  });

  app.post<{ Params: { id: string } }>("/sheets/:id/share", async (request, reply) => {
    const { id } = request.params;

    const existing = await prisma.sheet.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "Sheet not found" });
    }

    const shareToken = randomUUID();
    const sheet = await prisma.sheet.update({
      where: { id },
      data: { isPublic: true, shareToken },
    });

    return reply.send({ shareToken: sheet.shareToken, shareUrl: `/sheets/share/${sheet.shareToken}` });
  });

  app.get<{ Params: { shareToken: string } }>("/sheets/share/:shareToken", async (request, reply) => {
    const { shareToken } = request.params;

    const sheet = await prisma.sheet.findUnique({
      where: { shareToken },
      select: { id: true, title: true, data: true, createdAt: true, updatedAt: true, isPublic: true },
    });

    if (!sheet || !sheet.isPublic) {
      return reply.code(404).send({ error: "Shared sheet not found" });
    }

    return reply.send({
      sheet,
      banner: {
        message: "This was created with Quant Workspace. Get your own AI assistant.",
        signUpUrl: "/signup",
      },
    });
  });
}
