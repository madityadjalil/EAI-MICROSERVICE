import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const resolvers = {
  Query: {
    id: () => 1,
    historyById: (_, { id }) => {
      return prisma.historyPayment.findUnique({ where: { id } });
    },
    historiesByUser: (_, { userId }) => {
      return prisma.historyPayment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    },
    allHistories: () => {
      return prisma.historyPayment.findMany({ orderBy: { createdAt: "desc" } });
    },
  },
  Mutation: {
    createHistory: async (_, { transactionId, userId, amount, method, status }) => {
      return prisma.historyPayment.create({
        data: { transactionId, userId, amount, method, status },
      });
    },
  },
};


