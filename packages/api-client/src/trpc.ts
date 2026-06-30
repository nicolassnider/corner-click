import type { CreateTRPCReact } from '@trpc/react-query'
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from 'api/src/trpc/routers/_app.js'

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>()
