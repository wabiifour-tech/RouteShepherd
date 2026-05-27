import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(new URL('/api/health', process.env.NEXTAUTH_URL || 'https://routeshepherd.vercel.app'));
}
