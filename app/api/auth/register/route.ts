import { checkEmailCode, createSession, hashPassword, normalizeEmail, validatePassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email) return jsonError("Please enter a valid email address.", 400);
  const passwordError = validatePassword(password);
  if (passwordError) return jsonError(passwordError, 400);

  const codeError = await checkEmailCode(email, code, "register");
  if (codeError) return jsonError(codeError, 400);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return jsonError("This email is already registered. Please log in.", 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    await tx.emailCode.delete({ where: { email } });
    return tx.user.create({ data: { email, passwordHash } });
  });

  await createSession(user.id);
  return Response.json({ email: user.email }, { status: 201 });
}
