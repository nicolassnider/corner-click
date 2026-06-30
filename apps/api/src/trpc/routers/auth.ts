import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { FirebaseAuthService } from "../../data/repositories/FirebaseAuthService.js";
import { FirebaseJudgeRepository } from "../../data/repositories/FirebaseJudgeRepository.js";
import { createLogger, toErr } from "@corner-click/logger";
import { TRPCError } from "@trpc/server";

const log = createLogger("trpc:auth");
const authService = new FirebaseAuthService();
const judgeRepo = new FirebaseJudgeRepository();

export const authRouter = router({
  pinLogin: publicProcedure
    .input(z.object({ pin: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const judgeRecord = await judgeRepo.findByPin(input.pin);

        if (!judgeRecord) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid PIN",
          });
        }

        const { id: judgeId, data: judgeData } = judgeRecord;

        await judgeRepo.updateStatus(
          judgeData.tournamentId,
          judgeId,
          "ONLINE",
          new Date().toISOString()
        );

        const customClaims = {
          role: "judge",
          tournamentId: judgeData.tournamentId,
          judgeId: judgeId,
          judgeName: judgeData.name,
        };

        const customToken = await authService.createJudgeToken(judgeId, customClaims);

        return {
          token: customToken,
          judge: {
            id: judgeId,
            name: judgeData.name,
            tournamentId: judgeData.tournamentId,
          },
        };
      } catch (error) {
        log.error({ err: toErr(error) }, "Error in pinLogin");
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal Server Error",
        });
      }
    }),

  adminLogin: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const adminData = await authService.loginAdmin(input.email, input.password);
        return {
          token: adminData.token,
          admin: {
            uid: adminData.uid,
            email: adminData.email,
            displayName: adminData.displayName,
          },
        };
      } catch (error: any) {
        log.error({ err: toErr(error) }, "Error in adminLogin");
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error.message || "Invalid credentials",
        });
      }
    }),

  guestLogin: publicProcedure
    .mutation(async () => {
      try {
        const guestData = await authService.createGuestToken();
        return {
          token: guestData.token,
          admin: {
            uid: guestData.uid,
            email: "demo@cornerclick.com",
            displayName: "Invitado (Demo)",
          },
        };
      } catch (error) {
        log.error({ err: toErr(error) }, "Error in guestLogin");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error creating guest token",
        });
      }
    }),

  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const user = ctx.user as any;
        if (user && user.tournamentId && user.judgeId) {
          await judgeRepo.updateStatus(user.tournamentId, user.judgeId, "OFFLINE");
        }
        return { success: true };
      } catch (error) {
        log.error({ err: toErr(error) }, "Error in logout");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error during logout",
        });
      }
    }),
});
