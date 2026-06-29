import { router, publicProcedure } from "../trpc.js";
import { tournamentsRouter } from "./tournaments.js";
import { judgesRouter } from "./judges.js";
import { matchesRouter } from "./matches.js";
import { categoriesRouter } from "./categories.js";
import { competitorsRouter } from "./competitors.js";

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", trpc: true };
  }),
  tournaments: tournamentsRouter,
  judges: judgesRouter,
  matches: matchesRouter,
  categories: categoriesRouter,
  competitors: competitorsRouter,
});

export type AppRouter = typeof appRouter;
