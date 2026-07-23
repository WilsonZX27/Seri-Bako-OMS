import { cookies } from "next/headers";

const COOKIE_NAME = "sb_temporary_password_handoff";

export async function setTemporaryPasswordHandoff(staffId: string, password: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, Buffer.from(JSON.stringify({ staffId, password })).toString("base64url"), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: `/staffs/${staffId}`, maxAge: 300,
  });
}

export async function readTemporaryPasswordHandoff(staffId: string) {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { staffId?: string; password?: string };
    return parsed.staffId === staffId ? parsed.password ?? null : null;
  } catch { return null; }
}
