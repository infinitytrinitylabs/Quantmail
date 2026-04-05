import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString =
  process.env["DATABASE_URL"] ??
  "postgresql://quantmail:quantmail@localhost:5432/quantmail";

const adapter = new PrismaPg(connectionString);

export const prisma = new PrismaClient({ adapter });
