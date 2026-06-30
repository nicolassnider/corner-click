import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { FirebaseMatchRepository } from "../../data/repositories/FirebaseMatchRepository.js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const matchRepo = new FirebaseMatchRepository();

const isSafeId = (id: string): boolean => /^[a-zA-Z0-9_-]+$/.test(id);

export const matchesRouter = router({
  updateStatus: protectedProcedure
    .input(
      z.object({
        matchId: z.string(),
        status: z.string(),
        isExtraTime: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await matchRepo.updateStatus(input.matchId, input.status);
        return { success: true, status: input.status };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error updating match status",
        });
      }
    }),

  submitScores: protectedProcedure
    .input(
      z.object({
        matchId: z.string(),
        cornerId: z.string(),
        redScore: z.number().optional().default(0),
        blueScore: z.number().optional().default(0),
        redWarnings: z.number().optional().default(0),
        blueWarnings: z.number().optional().default(0),
        redDeductions: z.number().optional().default(0),
        blueDeductions: z.number().optional().default(0),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Firestore not initialized",
        });
      }

      try {
        const scores = {
          redScore: input.redScore,
          blueScore: input.blueScore,
          redWarnings: input.redWarnings,
          blueWarnings: input.blueWarnings,
          redDeductions: input.redDeductions,
          blueDeductions: input.blueDeductions,
        };

        await matchRepo.submitScores(input.matchId, input.cornerId, scores);
        return { success: true, message: "Scores submitted successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error submitting scores",
        });
      }
    }),

  getScores: publicProcedure
    .input(z.object({ matchId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Firestore not initialized",
        });
      }

      try {
        const scores = await matchRepo.getScores(input.matchId);
        return { scores };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching scores",
        });
      }
    }),

  getByTournament: publicProcedure
    .input(z.object({ tournamentId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Firestore not initialized",
        });
      }

      try {
        const matches = await matchRepo.findByTournament(input.tournamentId);
        return matches;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching matches for tournament",
        });
      }
    }),

  declareWinner: protectedProcedure
    .input(
      z.object({
        matchId: z.string(),
        winnerId: z.string(),
        tournamentId: z.string(),
        nextMatchId: z.string().optional(),
        losersMatchId: z.string().optional(),
        loserId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (
          !isSafeId(input.matchId) ||
          !isSafeId(input.tournamentId) ||
          !isSafeId(input.winnerId)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid characters in ID fields",
          });
        }
        if (input.nextMatchId && !isSafeId(input.nextMatchId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid nextMatchId",
          });
        }
        if (input.losersMatchId && !isSafeId(input.losersMatchId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid losersMatchId",
          });
        }
        if (input.loserId && !isSafeId(input.loserId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid loserId",
          });
        }

        await matchRepo.declareWinner(input.matchId, {
          winnerId: input.winnerId,
          tournamentId: input.tournamentId,
          nextMatchId: input.nextMatchId,
          losersMatchId: input.losersMatchId,
          loserId: input.loserId,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error declaring winner",
        });
      }
    }),
});
