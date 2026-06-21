import { DecodedIdToken } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken & {
        role?: string;
        tournamentId?: string;
        judgeId?: string;
        judgeName?: string;
      };
    }
  }
}
