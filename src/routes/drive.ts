import { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function driveRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { userId: string } }>("/drive/:userId", async (request, reply) => {
    const { userId } = request.params;
    const files = await prisma.driveFile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ files });
  });

  app.post<{
    Body: { userId: string; name: string; mimeType?: string; type?: string; size?: number; url: string };
  }>("/drive", async (request, reply) => {
    const { userId, name, mimeType, type, size = 0, url } = request.body;
    const resolvedMimeType = mimeType ?? type;

    if (!userId || !name || !resolvedMimeType || !url) {
      return reply.code(400).send({ error: "userId, name, mimeType, and url are required" });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return reply.code(400).send({ error: "Invalid url format" });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return reply.code(400).send({ error: "url must use http or https protocol" });
    }

    const file = await prisma.driveFile.create({
      data: { userId, name, mimeType: resolvedMimeType, size, url },
    });

    return reply.code(201).send({ file });
  });

  app.delete<{ Params: { id: string }; Body: { userId?: string } }>("/drive/:id", async (request, reply) => {
    const { id } = request.params;
    const userId = request.body?.userId;

    const existing = userId
      ? await prisma.driveFile.findFirst({ where: { id, userId } })
      : await prisma.driveFile.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "File not found" });
    }

    await prisma.driveFile.delete({ where: { id } });
    return reply.send({ status: "deleted" });
  });
}
