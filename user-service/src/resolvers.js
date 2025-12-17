import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const resolvers = {
  Query: {
    users: async () => {
      return prisma.user.findMany();
    },

    userById: async (_, { id }) => {
      return prisma.user.findUnique({
        where: { id },
      });
    },
  },

  Mutation: {
    createUser: async (_, args) => {
      return prisma.user.create({
        data: {
          id: args.id,
          name: args.name,
          email: args.email,
          phone: args.phone,
        },
      });
    },
  },
};
