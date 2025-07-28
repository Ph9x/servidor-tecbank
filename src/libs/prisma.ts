import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

//CONEXÃO COM O BANCO DE DADOS || EVITO TER VÁRIAS CONEXÕES AO MESMO TEMPO NO AMBIENTE DE DESENVOLVIMENTO
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient}

export const prisma = globalForPrisma.prisma || new PrismaClient();

if(process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { Decimal };
