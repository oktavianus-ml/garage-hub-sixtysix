import { NextResponse, connection } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";
import { createSessionCookie, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  await connection();
  let idToken = "";
  try {
    const body = (await request.json()) as { idToken?: string };
    idToken = body.idToken ?? "";
  } catch {
    idToken = "";
  }

  if (!idToken) {
    return NextResponse.json({ message: "Sesi masuk tidak lengkap." }, { status: 400 });
  }

  try {
    const session = await createSessionCookie(idToken);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Masuk gagal.";
    return NextResponse.json({ message }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
