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

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return jsonError("No account found with this email.", 404);

  const codeError = await checkEmailCode(email, code, "reset");
  if (codeError) return jsonError(codeError, 400);

  const passwordHash = await hashPassword(password);
  // Dropping every session signs out other devices that may have used the old password.
  await prisma.$transaction([
    prisma.emailCode.delete({ where: { email } }),
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  await createSession(user.id);
  return Response.json({ email: user.email });
}
