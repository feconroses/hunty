import { type NextRequest, NextResponse } from "next/server";
import http from "http";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

function proxyRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function proxyAuth(request: NextRequest, path: string) {
  const url = new URL(`/api/auth/${path}`, BACKEND_URL);

  // Forward query params (e.g. verify-email?token=...)
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {};

  // Forward content-type if present
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  // Forward cookies (for refresh_token httpOnly cookie)
  const cookie = request.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;

  // Forward authorization header
  const auth = request.headers.get("authorization");
  if (auth) headers["authorization"] = auth;

  // Forward CSRF token
  const csrf = request.headers.get("x-csrf-token");
  if (csrf) headers["x-csrf-token"] = csrf;

  // Forward body for POST/PUT/PATCH
  let body: string | undefined;
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    try {
      body = await request.text();
    } catch {
      // no body
    }
  }

  const response = await proxyRequest(url.toString(), request.method, headers, body);

  const nextResponse = new NextResponse(response.body, {
    status: response.statusCode,
    headers: {
      "Content-Type":
        (response.headers["content-type"] as string) || "application/json",
    },
  });

  // Forward Set-Cookie headers from the backend
  // Using http module gives us raw access (fetch() strips Set-Cookie)
  const setCookie = response.headers["set-cookie"];
  console.log(`[auth-proxy] ${request.method} /api/auth/${path} → ${response.statusCode}, raw set-cookie:`, setCookie);
  if (setCookie) {
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const c of cookies) {
      nextResponse.headers.append("Set-Cookie", c);
    }
  }

  return nextResponse;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyAuth(request, path.join("/"));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyAuth(request, path.join("/"));
}
