import type { AgeGroupDef, BeltGroupDef, Category, WeightClass } from '@corner-click/types'
import {
  Gender,
  getBeltsForAgeGroup,
  LOCAL_AGES,
  WORLD_CHAMPIONSHIP_AGES,
  WORLD_CUP_AGES,
} from '@corner-click/types'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { rtdb } from '../../services/firebase.js'
import { protectedProcedure, publicProcedure, router } from '../trpc.js'

export const categoriesRouter = router({
  getAll: publicProcedure
    .input(z.object({ tournamentId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!rtdb) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not initialized',
        })
      }
      try {
        const categoriesRef = rtdb.ref(`tournaments/${input.tournamentId}/categories`)
        const snapshot = await categoriesRef.once('value')

        if (!snapshot.exists()) {
          return []
        }

        const data = snapshot.val()
        return Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        })) as Category[]
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error fetching categories',
        })
      }
    }),

  generateOfficial: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        type: z.enum(['LOCAL_OPEN', 'WORLD_CUP', 'WORLD_CHAMPIONSHIP']),
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
        const categoriesRef = rtdb.ref(`tournaments/${input.tournamentId}/categories`)

        // Clear existing
        const existingSnapshot = await categoriesRef.once('value')
        if (existingSnapshot.exists()) {
          const data = existingSnapshot.val()
          for (const key of Object.keys(data)) {
            await rtdb.ref(`tournaments/${input.tournamentId}/categories/${key}`).remove()
          }
        }

        const ageGroups =
          input.type === 'LOCAL_OPEN'
            ? LOCAL_AGES
            : input.type === 'WORLD_CHAMPIONSHIP'
              ? WORLD_CHAMPIONSHIP_AGES
              : WORLD_CUP_AGES

        const updates: Record<string, any> = {}

        const createCategoryNode = (
          ageGroup: AgeGroupDef,
          gender: Gender,
          weight: WeightClass,
          belt: BeltGroupDef
        ) => {
          const id = categoriesRef.push().key as string
          const catData: Omit<Category, 'id'> = {
            tournamentId: input.tournamentId,
            name: `${ageGroup.name} ${gender === 'MALE' ? 'Masculino' : 'Femenino'} - ${belt.name} - ${weight.name}`,
            gender,
            ageGroup: ageGroup.name,
            beltLevel: belt.name,
            weightClass: weight.name,
            matchDuration: 2,
            rounds: 2,
          }
          updates[id] = catData
        }

        for (const age of ageGroups) {
          const belts = getBeltsForAgeGroup(input.type, age.name)
          for (const belt of belts) {
            for (const weight of age.maleWeights) {
              createCategoryNode(age, Gender.MALE, weight, belt)
            }
            for (const weight of age.femaleWeights) {
              createCategoryNode(age, Gender.FEMALE, weight, belt)
            }
          }
        }

        await categoriesRef.update(updates)
        return { success: true }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error generating categories',
        })
      }
    }),

  mergeEmpty: protectedProcedure
    .input(z.object({ tournamentId: z.string() }))
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
        const catRef = rtdb.ref(`tournaments/${input.tournamentId}/categories`)
        const catSnap = await catRef.once('value')
        const categories: Category[] = catSnap.exists()
          ? Object.keys(catSnap.val()).map((k) => ({
              id: k,
              ...catSnap.val()[k],
            }))
          : []

        const compRef = rtdb.ref(`tournaments/${input.tournamentId}/competitors`)
        const compSnap = await compRef.once('value')
        const allComps: any[] = compSnap.exists()
          ? Object.keys(compSnap.val()).map((k) => ({
              id: k,
              ...compSnap.val()[k],
            }))
          : []

        const counts: Record<string, number> = {}
        categories.forEach((c) => (counts[c.id] = 0))
        allComps.forEach((c) => {
          if (counts[c.categoryId] !== undefined) {
            counts[c.categoryId]++
          }
        })

        const groups: Record<string, Category[]> = {}
        categories.forEach((c) => {
          const key = `${c.ageGroup}-${c.gender}-${c.beltLevel}`
          if (!groups[key]) {
            groups[key] = []
          }
          groups[key].push(c)
        })

        const competitorUpdates: Record<string, any> = {}
        const categoriesToDelete: string[] = []
        const categoryUpdates: Record<string, any> = {}

        for (const catsInGroup of Object.values(groups)) {
          for (let i = 0; i < catsInGroup.length; i++) {
            const c = catsInGroup[i]
            const count = counts[c.id] ?? 0

            if (count === 0) {
              categoriesToDelete.push(c.id)
              continue
            }

            if (count < 4) {
              if (i + 1 < catsInGroup.length) {
                const nextC = catsInGroup[i + 1]
                allComps
                  .filter((comp) => comp.categoryId === c.id)
                  .forEach((comp) => {
                    competitorUpdates[
                      `tournaments/${input.tournamentId}/competitors/${comp.id}/categoryId`
                    ] = nextC.id
                    comp.categoryId = nextC.id
                  })
                counts[nextC.id] = (counts[nextC.id] || 0) + count
                categoryUpdates[`tournaments/${input.tournamentId}/categories/${nextC.id}/name`] =
                  `${nextC.name} + ${c.weightClass}`
                categoriesToDelete.push(c.id)
              }
            }
          }
        }

        const allUpdates = { ...competitorUpdates, ...categoryUpdates }
        if (Object.keys(allUpdates).length > 0) {
          await rtdb.ref().update(allUpdates)
        }

        for (const categoryId of categoriesToDelete) {
          await rtdb.ref(`tournaments/${input.tournamentId}/categories/${categoryId}`).remove()
        }

        return { success: true }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error merging categories',
        })
      }
    }),

  updateBracketType: protectedProcedure
    .input(
      z.object({
        tournamentId: z.string(),
        categoryId: z.string(),
        bracketType: z.any(),
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
        const categoryRef = rtdb.ref(
          `tournaments/${input.tournamentId}/categories/${input.categoryId}`
        )
        await categoryRef.update({ bracketType: input.bracketType })
        return { success: true }
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error updating bracket type',
        })
      }
    }),
})
