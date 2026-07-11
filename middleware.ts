import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://audit.zybee.xyz",
  "https://zybee.xyz",
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3001", "http://127.0.0.1:3001"] : [])
];

// Paths that should NOT be cached
const NO_CACHE_PATHS = ["/api/"];

export function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const origin = request.headers.get("origin") || "";
  const isApiRoute = pathname.startsWith("/api/");

  // Handle preflight CORS requests
  if (request.method === "OPTIONS" && isApiRoute) {
    const response = new NextResponse(null, { status: 204 });
    // Only allow specific origins
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.headers.set("Access-Control-Max-Age", "86400");
    }
    return response;
  }

  // Block cross-origin requests to API routes (except from allowed origins)
  if (isApiRoute && origin && !ALLOWED_ORIGINS.includes(origin) && !origin.includes("tailscale")) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy - restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  );

  // HSTS (production only)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // CORS for API routes - only from allowed origins
  if (isApiRoute) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    } else {
      // Same-origin requests don't have Origin header
      response.headers.set("Access-Control-Allow-Origin", "same-origin");
    }
  }

  // Cache control for API routes
  if (isApiRoute) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

// Only run middleware on matching paths
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match all pages except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
