import type { AuthUser, Opportunity } from "../shared/schema";

export const memoryStore = {
  users: new Map<
    string,
    AuthUser & {
      passwordHash: string;
    }
  >(),
  sessions: new Map<
    string,
    {
      userId: string;
      expiresAt: Date;
    }
  >(),
  opportunities: [] as Opportunity[],
  lastSyncAt: null as Date | null,
};
