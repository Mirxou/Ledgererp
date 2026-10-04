/**
 * User helper — upsert users from Pi SDK auth into DB.
 * Every authenticated Pi user gets a DB record for:
 * - Notification targeting
 * - Settings persistence
 * - Escrow transaction tracking
 * - Audit log association
 */
import { db } from "@/lib/db";

/** Upsert user from Pi SDK authentication */
export async function upsertUser(params: {
  piUid: string;
  username: string;
  accessToken?: string;
  avatar?: string;
}) {
  return db.user.upsert({
    where: { piUid: params.piUid },
    update: {
      username: params.username,
      accessToken: params.accessToken || undefined,
      avatar: params.avatar || undefined,
      lastLoginAt: new Date(),
    },
    create: {
      piUid: params.piUid,
      username: params.username,
      accessToken: params.accessToken || "",
      avatar: params.avatar || "",
    },
  });
}

/** Get user by Pi UID */
export async function getUserByPiUid(piUid: string) {
  return db.user.findUnique({ where: { piUid } });
}

/** Get or create user ID for notification targeting */
export async function ensureUserId(piUid: string, username: string): Promise<string> {
  const user = await upsertUser({ piUid, username });
  return user.id;
}
