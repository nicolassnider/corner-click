import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { rtdb } from "../../services/firebase.js";
import type { Competitor } from "@corner-click/types";

export const competitorsRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        categoryId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!rtdb) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }
      try {
        const competitorsRef = rtdb.ref(`tournaments/${input.tournamentId}/competitors`);
        const snapshot = await competitorsRef.once("value");

        if (!snapshot.exists()) return [];

        const data = snapshot.val();
        let competitors = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        })) as Competitor[];

        if (input.categoryId) {
          competitors = competitors.filter((c) => c.categoryId === input.categoryId);
        }

        return competitors;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching competitors",
        });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        school: z.string(),
        beltLevel: z.string(),
        categoryId: z.string(),
        age: z.number().optional(),
        weight: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!rtdb) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      const user = ctx.user as any;
      if (user?.role === "guest") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Modo Solo Lectura",
        });
      }

      try {
        const competitorsRef = rtdb.ref(`tournaments/${input.tournamentId}/competitors`);
        const newCompetitorRef = competitorsRef.push();

        const newCompetitor = {
          firstName: input.firstName,
          lastName: input.lastName,
          school: input.school,
          beltLevel: input.beltLevel,
          categoryId: input.categoryId,
          age: input.age,
          weight: input.weight,
          tournamentId: input.tournamentId,
        };

        await newCompetitorRef.set(newCompetitor);

        return {
          id: newCompetitorRef.key as string,
          ...newCompetitor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error creating competitor",
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        competitorId: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        school: z.string().optional(),
        beltLevel: z.string().optional(),
        categoryId: z.string().optional(),
        age: z.number().optional(),
        weight: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!rtdb) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      const user = ctx.user as any;
      if (user?.role === "guest") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Modo Solo Lectura",
        });
      }

      try {
        const competitorRef = rtdb.ref(
          `tournaments/${input.tournamentId}/competitors/${input.competitorId}`
        );

        const updates: any = {};
        if (input.firstName !== undefined) updates.firstName = input.firstName;
        if (input.lastName !== undefined) updates.lastName = input.lastName;
        if (input.school !== undefined) updates.school = input.school;
        if (input.beltLevel !== undefined) updates.beltLevel = input.beltLevel;
        if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
        if (input.age !== undefined) updates.age = input.age;
        if (input.weight !== undefined) updates.weight = input.weight;

        await competitorRef.update(updates);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating competitor",
        });
      }
    }),

  delete: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        competitorId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!rtdb) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      const user = ctx.user as any;
      if (user?.role === "guest") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Modo Solo Lectura",
        });
      }

      try {
        const competitorRef = rtdb.ref(
          `tournaments/${input.tournamentId}/competitors/${input.competitorId}`
        );
        await competitorRef.remove();
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error deleting competitor",
        });
      }
    }),
});
