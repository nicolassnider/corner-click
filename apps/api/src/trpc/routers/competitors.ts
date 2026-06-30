import type { Competitor } from '@corner-click/types'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { rtdb } from '../../services/firebase.js'
import { protectedProcedure, publicProcedure, router } from '../trpc.js'

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
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }
      try {
        const competitorsRef = rtdb.ref(`tournaments/${input.tournamentId}/competitors`)
        const snapshot = await competitorsRef.once('value')

        if (!snapshot.exists()) {
          return []
        }

        const data = snapshot.val()
        let competitors = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        })) as Competitor[]

        if (input.categoryId) {
          competitors = competitors.filter((c) => c.categoryId === input.categoryId)
        }

        return competitors
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error fetching competitors',
        })
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        club: z.string(),
        belt: z.string().optional(),
        categoryId: z.string(),
        birthDate: z.string().optional(),
        weight: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!rtdb) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      const user = ctx.user as any
      if (user?.role === 'guest') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Modo Solo Lectura',
        })
      }

      try {
        const competitorsRef = rtdb.ref(`tournaments/${input.tournamentId}/competitors`)
        const newCompetitorRef = competitorsRef.push()

        const newCompetitor = {
          firstName: input.firstName,
          lastName: input.lastName,
          club: input.club,
          belt: input.belt || '1º – 3º Dan',
          categoryId: input.categoryId,
          birthDate: input.birthDate,
          weight: input.weight,
          tournamentId: input.tournamentId,
        }

        await newCompetitorRef.set(newCompetitor)

        return {
          id: newCompetitorRef.key as string,
          ...newCompetitor,
        }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error creating competitor',
        })
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        competitorId: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        club: z.string().optional(),
        belt: z.string().optional(),
        categoryId: z.string().optional(),
        birthDate: z.string().optional(),
        weight: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!rtdb) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      const user = ctx.user as any
      if (user?.role === 'guest') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Modo Solo Lectura',
        })
      }

      try {
        const competitorRef = rtdb.ref(
          `tournaments/${input.tournamentId}/competitors/${input.competitorId}`
        )

        const updates: any = {}
        if (input.firstName !== undefined) {
          updates.firstName = input.firstName
        }
        if (input.lastName !== undefined) {
          updates.lastName = input.lastName
        }
        if (input.club !== undefined) {
          updates.club = input.club
        }
        if (input.belt !== undefined) {
          updates.belt = input.belt
        }
        if (input.categoryId !== undefined) {
          updates.categoryId = input.categoryId
        }
        if (input.birthDate !== undefined) {
          updates.birthDate = input.birthDate
        }
        if (input.weight !== undefined) {
          updates.weight = input.weight
        }

        await competitorRef.update(updates)
        return { success: true }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error updating competitor',
        })
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
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      const user = ctx.user as any
      if (user?.role === 'guest') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Modo Solo Lectura',
        })
      }

      try {
        const competitorRef = rtdb.ref(
          `tournaments/${input.tournamentId}/competitors/${input.competitorId}`
        )
        await competitorRef.remove()
        return { success: true }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error deleting competitor',
        })
      }
    }),
})
