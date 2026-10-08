import { createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { ADMIN_ROLE, PASSWORD_MAX, PASSWORD_MIN, SESSION_COOKIE, type CodePurpose } from "@/lib/constants";
import { prisma } from "@/lib/db";

const SESSION_DAYS = 30;

export const CODE_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function generateCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(email: string, code: string) {
  return sha256(`${email}:${code}`);
}

/** Returns an error message, or null when the code is valid. Callers delete the code once it is used. */
export async function checkEmailCode(email: string, code: string, purpose: CodePurpose) {
  const record = await prisma.emailCode.findUnique({ where: { email } });
  if (!record || record.purpose !== purpose || record.expiresAt < new Date() || record.attempts >= MAX_CODE_ATTEMPTS) {
    return "The code has expired. Please request a new one.";
  }
  if (record.codeHash !== hashCode(email, code)) {
    await prisma.emailCode.update({ where: { email }, data: { attempts: { increment: 1 } } });
    return "Incorrect verification code.";
  }
  return null;
}

export function validatePassword(password: string) {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX
    ? null
    : `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.`;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash: sha256(token), expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, role: true, points: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  return user?.role === ADMIN_ROLE ? user : null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  cookieStore.delete(SESSION_COOKIE);
}
