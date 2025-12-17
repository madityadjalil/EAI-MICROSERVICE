import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

export const resolvers = {
  // =========================
  // QUERY (Melihat Data)
  // =========================
  Query: {
    bookings: async () => {
      return prisma.booking.findMany();
    },

    booking: async (_, { id }) => {
      return prisma.booking.findUnique({
        where: { id }, // Pastikan tipe data ID di schema.prisma (Int/String) sesuai
      });
    },
  },

  // =========================
  // RELATION: BOOKING → MOVIE
  // =========================
  // Bagian ini TIDAK DIHAPUS.
  // Booking Service tetap menembak Movie Service untuk detail film.
  Booking: {
    movie: async (parent) => {
      try {
        const response = await fetch(process.env.MOVIE_SERVICE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query {
                movieById(id: ${parent.movieId}) {
                  id
                  title
                  duration
                  rating
                }
              }
            `,
          }),
        });

        const result = await response.json();

        // Jika ada error dari Movie Service, lempar error atau return null
        if (result.errors) {
            console.error("Error from Movie Service:", result.errors);
            return null; 
        }

        return result.data.movieById;
      } catch (error) {
        console.error("Gagal menghubungi Movie Service:", error);
        return null; // Mengembalikan null agar booking tetap muncul walau movie error
      }
    },
  },

  // =========================
  // MUTATION (Mengubah Data)
  // =========================
  Mutation: {
    // 1️⃣ CREATE BOOKING
    // Fokus: Cek kursi kosong -> Reservasi (Status PENDING)
    createBooking: async (_, args) => {
      // A. VALIDASI SEAT
      // Cek apakah ada booking lain di Movie ID yang sama dengan Seat Number yang sama
      const existingSeat = await prisma.booking.findFirst({
        where: {
          movieId: args.movieId,
          seatNumber: args.seatNumber,
          // Opsional: Jika ingin kursi yg statusnya 'CANCELLED' boleh diambil lagi,
          // tambahkan filter status: { not: 'CANCELLED' }
        },
      });

      if (existingSeat) {
        throw new Error(
          `Seat ${args.seatNumber} sudah dibooking untuk movie ini. Silakan pilih kursi lain.`
        );
      }

      // B. SIMPAN BOOKING
      return prisma.booking.create({
        data: {
          userId: args.userId,
          movieId: args.movieId,
          seatNumber: args.seatNumber,
          totalPrice: args.totalPrice,
          status: "PENDING", // Status awal selalu PENDING
        },
      });
    },

    // 2️⃣ UPDATE STATUS
    // Ini adalah endpoint yang nanti akan dipanggil oleh PAYMENT SERVICE
    // setelah user sukses membayar di sana.
    updateBookingStatus: async (_, { id, status }) => {
      // Cek dulu apakah bookingnya ada
      const checkBooking = await prisma.booking.findUnique({
          where: { id }
      });

      if (!checkBooking) {
          throw new Error("Booking ID tidak ditemukan");
      }

      // Update status (misal jadi "PAID" atau "CANCELLED")
      return prisma.booking.update({
        where: { id },
        data: { status },
      });
    },
  },
};