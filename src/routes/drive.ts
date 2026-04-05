import { FastifyInstance } from "fastify";
import {
  MOCK_DRIVE_FILES,
  semanticSearch,
  type DriveFile,
} from "../services/driveSearchService";

export async function driveRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /drive/files
   * Returns the full catalogue of drive files.
   * In a production system this would be scoped to the authenticated user.
   */
  app.get("/drive/files", async (_request, reply) => {
    const files: DriveFile[] = MOCK_DRIVE_FILES;
    return reply.send({ files, total: files.length });
  });

  /**
   * POST /drive/search
   * Accepts a natural language query and returns semantically relevant files
   * with match scores and contextual snippets.
   *
   * Body: { query: string, limit?: number, minScore?: number }
   */
  app.post<{
    Body: {
      query: string;
      limit?: number;
      minScore?: number;
    };
  }>("/drive/search", async (request, reply) => {
    const { query, limit, minScore } = request.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return reply
        .code(400)
        .send({ error: "query is required and must be a non-empty string" });
    }

    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      return reply
        .code(400)
        .send({ error: "limit must be a positive integer" });
    }

    if (minScore !== undefined && (typeof minScore !== "number" || minScore < 0 || minScore > 1)) {
      return reply
        .code(400)
        .send({ error: "minScore must be a number between 0 and 1" });
    }

    const results = semanticSearch(query.trim(), MOCK_DRIVE_FILES, {
      limit: limit ?? 10,
      minScore: minScore ?? 0.1,
    });

    return reply.send({
      query: query.trim(),
      total: results.length,
      results,
    });
  });
}
