import { NextResponse } from "next/server";
import { makeClearCookieHeader } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", makeClearCookieHeader());
  return res;
}