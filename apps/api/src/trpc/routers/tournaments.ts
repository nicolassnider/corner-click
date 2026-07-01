import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TournamentStatus } from '@corner-click/types'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { FirebaseTournamentRepository } from '../../data/repositories/FirebaseTournamentRepository.js'
import { protectedProcedure, publicProcedure, router } from '../trpc.js'

const tournamentRepo = new FirebaseTournamentRepository()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getDemoDataPath = () => {
  let targetPath = path.join(__dirname, '../../../data/demo-data.json')
  if (!fs.existsSync(targetPath)) {
    targetPath = path.join(__dirname, '../../../../src/data/demo-data.json')
  }
  return targetPath
}

let cachedDemoData: any | null = null
const getDemoData = () => {
  if (!cachedDemoData) {
    const dataPath = getDemoDataPath()
    if (fs.existsSync(dataPath)) {
      const fileContents = fs.readFileSync(dataPath, 'utf-8')
      cachedDemoData = JSON.parse(fileContents)
    } else {
      cachedDemoData = []
    }
  }
  return cachedDemoData
}

export const tournamentsRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not initialized',
      })
    }

    const user = ctx.user
    if (user?.role === 'guest') {
      return getDemoData()
    }

    try {
      const tournaments = await tournamentRepo.findAll()
      return tournaments
    } catch (_error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching tournaments',
      })
    }
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    if (!ctx.db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not initialized',
      })
    }

    const user = ctx.user
    if (user?.role === 'guest') {
      const demoData = getDemoData()
      const demoTournament = demoData.find((t: any) => t.id === input.id)
      if (!demoTournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found in Demo',
        })
      }
      return demoTournament
    }

    try {
      const tournament = await tournamentRepo.findById(input.id)
      if (!tournament) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tournament not found',
        })
      }
      return tournament
    } catch (_error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching tournament',
      })
    }
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        date: z.string().optional(),
        location: z.string().optional(),
        areas: z.number().optional(),
        rings: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      const user = ctx.user
      if (user?.role === 'guest') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Modo Solo Lectura: No se pueden crear datos en la Demo',
        })
      }

      try {
        const finalAreas = input.areas ?? input.rings ?? 1

        const newTournament = {
          name: input.name,
          date: input.date || new Date().toISOString(),
          location: input.location || '',
          areas: finalAreas,
          status: TournamentStatus.UPCOMING,
          createdAt: new Date().toISOString(),
        }

        const createdTournament = await tournamentRepo.create(newTournament)
        return createdTournament
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error creating tournament',
        })
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        date: z.string().optional(),
        location: z.string().optional(),
        areas: z.number().optional(),
        status: z.nativeEnum(TournamentStatus).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      const user = ctx.user
      if (user?.role === 'guest') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Modo Solo Lectura: No se pueden editar datos en la Demo',
        })
      }

      try {
        const existing = await tournamentRepo.findById(input.id)
        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found',
          })
        }

        const updates: any = {}
        if (input.name !== undefined) {
          updates.name = input.name
        }
        if (input.date !== undefined) {
          updates.date = input.date
        }
        if (input.location !== undefined) {
          updates.location = input.location
        }
        if (input.areas !== undefined) {
          updates.areas = input.areas
        }
        if (input.status !== undefined) {
          updates.status = input.status
        }

        const updatedTournament = await tournamentRepo.update(input.id, updates)
        if (!updatedTournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found after update',
          })
        }
        return updatedTournament
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error updating tournament',
        })
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }

      const user = ctx.user
      if (user?.role === 'guest') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Modo Solo Lectura: No se pueden borrar datos en la Demo',
        })
      }

      try {
        const existing = await tournamentRepo.findById(input.id)
        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found',
          })
        }

        await tournamentRepo.delete(input.id)
        return { success: true }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error deleting tournament',
        })
      }
    }),
})
