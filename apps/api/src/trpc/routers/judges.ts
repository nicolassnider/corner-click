import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { FirebaseJudgeRepository } from '../../data/repositories/FirebaseJudgeRepository.js'
import { protectedProcedure, router } from '../trpc.js'

const judgeRepo = new FirebaseJudgeRepository()

const generatePin = (): string => Math.floor(1000 + Math.random() * 9000).toString()

export const judgesRouter = router({
  getAll: protectedProcedure
    .input(z.object({ tournamentId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      try {
        await judgeRepo.cleanupExpiredJudges(input.tournamentId)
        const judges = await judgeRepo.findByTournament(input.tournamentId)
        return judges
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error fetching judges',
        })
      }
    }),

  getById: protectedProcedure
    .input(z.object({ tournamentId: z.string(), judgeId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      try {
        const judges = await judgeRepo.findByTournament(input.tournamentId)
        const judge = judges.find((j) => j.id === input.judgeId)
        if (!judge) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Judge not found',
          })
        }
        return judge
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error fetching judge',
        })
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      try {
        const tDoc = await ctx.db.collection('tournaments').doc(input.tournamentId).get()
        if (!tDoc.exists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found',
          })
        }

        let pin = ''
        let isUnique = false

        while (!isUnique) {
          pin = generatePin()
          const existing = await judgeRepo.findByPin(pin)
          if (!existing) {
            isUnique = true
          }
        }

        const judgeData = {
          name: input.name,
          pin,
          tournamentId: input.tournamentId,
          status: 'OFFLINE' as any,
          currentAssignment: null,
          createdAt: new Date().toISOString(),
        }

        const createdJudge = await judgeRepo.create(input.tournamentId, judgeData)
        return createdJudge
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error creating judge',
        })
      }
    }),

  assign: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        judgeId: z.string(),
        areaId: z.string(),
        cornerId: z.string(),
        matchId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      try {
        const allJudges = await judgeRepo.findByTournament(input.tournamentId)
        const existingAssignment = allJudges.find(
          (j) =>
            j.id !== input.judgeId &&
            j.currentAssignment?.areaId === input.areaId &&
            j.currentAssignment?.cornerId === input.cornerId
        )

        if (existingAssignment) {
          const existingName = existingAssignment.name || 'Another judge'
          throw new TRPCError({
            code: 'CONFLICT',
            message: `${existingName} is already assigned to Area ${input.areaId} as ${input.cornerId}.`,
          })
        }

        const judgeDoc = allJudges.find((j) => j.id === input.judgeId)
        if (!judgeDoc) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Judge not found',
          })
        }

        const currentAssignment = {
          tournamentId: input.tournamentId,
          areaId: input.areaId,
          cornerId: input.cornerId,
          matchId: input.matchId || null,
        }

        await judgeRepo.updateAssignment(input.tournamentId, input.judgeId, currentAssignment)
        return { message: 'Judge assigned successfully', currentAssignment }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error assigning judge',
        })
      }
    }),

  disconnect: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        judgeId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      try {
        await judgeRepo.updateStatus(input.tournamentId, input.judgeId, 'OFFLINE')
        await judgeRepo.updateAssignment(input.tournamentId, input.judgeId, null)
        return { success: true }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error disconnecting judge',
        })
      }
    }),

  delete: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        judgeId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      try {
        await judgeRepo.delete(input.tournamentId, input.judgeId)
        return { success: true }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error deleting judge',
        })
      }
    }),
})
