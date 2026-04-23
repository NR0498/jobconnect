import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Request, Response } from "express";
import { authSessions, authUserSchema, loginUserSchema, registerUserSchema, users } from "../shared/schema";
import { db, isDatabaseConfigured } from "./db";
import { memoryStore } from "./memoryStore";

const SESSION_COOKIE_NAME = "jobconnect_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookieValue(request: Request, cookieName: string) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(cookie.slice(cookieName.length + 1));
    }
  }

  return null;
}

export function clearSessionCookie(response: Response) {
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Lax";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
}

function setSessionCookie(response: Response, token: string) {
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Lax";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${
      SESSION_TTL_MS / 1000
    }; SameSite=${sameSite}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}

async function createSession(response: Response, userId: string) {
  const token = nanoid(48);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  if (db && isDatabaseConfigured) {
    await db.insert(authSessions).values({
      id: nanoid(),
      userId,
      tokenHash,
      expiresAt,
    });
  } else {
    memoryStore.sessions.set(tokenHash, {
      userId,
      expiresAt,
    });
  }

  setSessionCookie(response, token);
}

export async function registerUser(input: unknown, response: Response) {
  const parsed = registerUserSchema.parse(input);
  const email = parsed.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.password, 10);

  if (db && isDatabaseConfigured) {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existing[0]) {
      throw new Error("An account with that email already exists.");
    }

    const user = {
      id: nanoid(),
      email,
      name: parsed.name.trim(),
      city: parsed.city?.trim(),
      passwordHash,
      avatarUrl: null,
    };

    await db.insert(users).values(user);
    await createSession(response, user.id);

    return authUserSchema.parse(user);
  }

  for (const user of Array.from(memoryStore.users.values())) {
    if (user.email === email) {
      throw new Error("An account with that email already exists.");
    }
  }

  const user = {
    id: nanoid(),
    email,
    name: parsed.name.trim(),
    city: parsed.city?.trim(),
    passwordHash,
  };

  memoryStore.users.set(user.id, user);
  await createSession(response, user.id);
  return authUserSchema.parse(user);
}

export async function loginUser(input: unknown, response: Response) {
  const parsed = loginUserSchema.parse(input);
  const email = parsed.email.trim().toLowerCase();

  if (db && isDatabaseConfigured) {
    const matches = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = matches[0];

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    const isValid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password.");
    }

    await createSession(response, user.id);
    return authUserSchema.parse(user);
  }

  const user = Array.from(memoryStore.users.values()).find(
    (candidate) => candidate.email === email,
  );
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isValid = await bcrypt.compare(parsed.password, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  await createSession(response, user.id);
  return authUserSchema.parse(user);
}

export async function getAuthenticatedUser(request: Request) {
  const token = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) return null;

  const tokenHash = hashToken(token);

  if (db && isDatabaseConfigured) {
    const sessions = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);
    const session = sessions[0];

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const usersFound = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const user = usersFound[0];

    return user ? authUserSchema.parse(user) : null;
  }

  const session = memoryStore.sessions.get(tokenHash);
  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const user = memoryStore.users.get(session.userId);
  return user ? authUserSchema.parse(user) : null;
}

export async function logoutUser(request: Request, response: Response) {
  const token = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) {
    clearSessionCookie(response);
    return;
  }

  const tokenHash = hashToken(token);

  if (db && isDatabaseConfigured) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
  } else {
    memoryStore.sessions.delete(tokenHash);
  }

  clearSessionCookie(response);
}

export async function cleanupExpiredSessions() {
  if (db && isDatabaseConfigured) {
    await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
    return;
  }

  for (const [tokenHash, session] of Array.from(memoryStore.sessions.entries())) {
    if (session.expiresAt < new Date()) {
      memoryStore.sessions.delete(tokenHash);
    }
  }
}
