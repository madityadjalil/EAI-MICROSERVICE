import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

export const resolvers = {
  Query: {
    transactionById: (_, { id }) => {
      return prisma.transaction.findUnique({
        where: { id },
      });
    },

    transactionsByUser: (_, { userId }) => {
      return prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    },
  },

  Mutation: {
    payBooking: async (_, { bookingId, userId }) => {
      // 1️⃣ IDEMPOTENCY
      const existing = await prisma.transaction.findFirst({
        where: { bookingId, status: "SUCCESS" },
      });

      if (existing) {
        throw new Error("Booking sudah dibayar");
      }

      let seatNumber = null;
      let amount = 0;

      try {
        // 2️⃣ GET BOOKING
        const bookingRes = await fetch(process.env.BOOKING_SERVICE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query {
                booking(id: ${bookingId}) {
                  id
                  seatNumber
                  totalPrice
                  status
                }
              }
            `,
          }),
        });

        const bookingJson = await bookingRes.json();
        if (bookingJson.errors) {
          throw new Error(bookingJson.errors[0].message);
        }

        const booking = bookingJson.data.booking;
        if (!booking || booking.status !== "PENDING") {
          throw new Error("Booking tidak valid");
        }

        seatNumber = booking.seatNumber;
        amount = booking.totalPrice;

        // 3️⃣ DECREASE WALLET
        const walletRes = await fetch(process.env.WALLET_SERVICE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              mutation {
                decreaseBalance(
                  userId: "${userId}",
                  amount: ${amount}
                ) {
                  balance
                }
              }
            `,
          }),
        });

        const walletJson = await walletRes.json();
        if (walletJson.errors) {
          throw new Error(walletJson.errors[0].message);
        }

        // 4️⃣ UPDATE BOOKING → PAID (ENUM TANPA STRING)
        const bookingUpdateRes = await fetch(process.env.BOOKING_SERVICE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              mutation {
                updateBookingStatus(
                  id: ${bookingId},
                  status: PAID
                ) {
                  id
                  status
                }
              }
            `,
          }),
        });

        const bookingUpdateJson = await bookingUpdateRes.json();
        if (bookingUpdateJson.errors) {
          // rollback wallet
          await fetch(process.env.WALLET_SERVICE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
                mutation {
                  increaseBalance(
                    userId: "${userId}",
                    amount: ${amount}
                  ) {
                    balance
                  }
                }
              `,
            }),
          });

          throw new Error("Gagal update booking");
        }

        // 5️⃣ SAVE SUCCESS
        return prisma.transaction.create({
          data: {
            bookingId,
            userId,
            amount,
            seatNumber,
            status: "SUCCESS",
          },
        });

      } catch (err) {
        console.error("PAYMENT FAILED:", err.message);

        // 6️⃣ SAVE FAILED
        return prisma.transaction.create({
          data: {
            bookingId,
            userId,
            amount: 0,
            seatNumber: null,
            status: "FAILED",
          },
        });
      }
    },
  },
};
