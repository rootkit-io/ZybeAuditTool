import { NextResponse } from "next/server";

// Empty middleware - no blocking
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: []
};
