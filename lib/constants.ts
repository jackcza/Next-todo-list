export const SESSION_COOKIE = "session";

export const RESEND_SECONDS = 60;
export const PASSWORD_MIN = 8;
// bcrypt ignores everything after 72 bytes.
export const PASSWORD_MAX = 72;

export const CODE_PURPOSES = ["register", "reset"] as const;
export type CodePurpose = (typeof CODE_PURPOSES)[number];

export function isCodePurpose(value: unknown): value is CodePurpose {
  return typeof value === "string" && (CODE_PURPOSES as readonly string[]).includes(value);
}
