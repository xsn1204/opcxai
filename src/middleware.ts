import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "opc-ai-dev-secret-key-32chars-x!"
);

interface SessionPayload {
  sub: string;
  role: "talent" | "corp";
}

// ─── 1. Bot User-Agent blocklist ──────────────────────────────────────────────
const BOT_UA_PATTERNS: RegExp[] = [
  /python-requests/i,
  /scrapy/i,
  /selenium/i,
  /phantomjs/i,
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /httpx/i,
  /go-http-client/i,
  /libwww-perl/i,
  /java\/\d/i,
];

function isBotUA(ua: string | null): boolean {
  if (!ua) return true; // no UA → treat as bot
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

// ─── 2. In-memory rate limiter ────────────────────────────────────────────────
// Single-instance safe. For multi-instance / edge deploys swap the Map for
// Upstash Redis: https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;       // max requests
const RATE_WINDOW = 60_000; // per 60 seconds

function checkRate(ip: string): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now();

  // Lazy cleanup — remove expired entries on every call
  if (rateMap.size > 5_000) {
    for (const [k, v] of rateMap) if (now >= v.resetAt) rateMap.delete(k);
  }

  const entry = rateMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return { ok: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW };
  }
  if (entry.count >= RATE_LIMIT) {
    return { ok: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  entry.count += 1;
  return { ok: true, remaining: RATE_LIMIT - entry.count, resetIn: entry.resetAt - now };
}

// Paths subject to rate limiting
const RATE_LIMITED_PATHS = ["/api/ai/diagnose", "/api/ai/polish-task"];

// ─── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = request.headers.get("user-agent");

  // ── Admin Basic Auth ──
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const adminPass = process.env.ADMIN_PASSWORD;
    const auth = request.headers.get("authorization");
    const valid =
      adminPass &&
      auth?.startsWith("Basic ") &&
      Buffer.from(auth.slice(6), "base64").toString() === `admin:${adminPass}`;
    if (!valid) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="OPC Admin"' },
      });
    }
  }

  // ── Bot UA check (all routes) ──
  if (isBotUA(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ── Rate limiting (AI endpoints only) ──
  if (RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p))) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const { ok, remaining, resetIn } = checkRate(ip);

    if (!ok) {
      return new NextResponse(
        JSON.stringify({ error: "请求过于频繁，请稍后再试", retryAfter: Math.ceil(resetIn / 1000) }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(resetIn / 1000)),
            "X-RateLimit-Limit": String(RATE_LIMIT),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    return res;
  }

  // ── Auth guard (page routes only) ──
  const token = request.cookies.get("opc_token")?.value;
  const isTalentRoute = pathname.startsWith("/talent");
  const isCorpRoute = pathname.startsWith("/corp");

  let session: SessionPayload | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      session = payload as unknown as SessionPayload;
    } catch {
      session = null;
    }
  }

  if ((isTalentRoute || isCorpRoute) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isTalentRoute && session?.role !== "talent") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isCorpRoute && session?.role !== "corp") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Page routes (auth guard + bot check)
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // AI API routes (rate limit + bot check)
    "/api/ai/:path*",
  ],
};
