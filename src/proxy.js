import { NextResponse } from "next/server";
import { verifyJWT } from "./lib/auth";
import corsHeaders from "./lib/cors";
import {
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_ROLE,
} from "./lib/constant";

export function proxy(request) {
  // Preflight requests never carry cookies, let the route's OPTIONS handler answer them.
  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  const user = verifyJWT(request);

  if (!user) {
    return NextResponse.json(
      {
        message: "Unauthorized Request",
      },
      {
        status: 401,
        headers: corsHeaders,
      },
    );
  }

  // Never trust identity headers sent by the client, always overwrite them
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(X_HEADER_USER_ID, user.id);
  requestHeaders.set(X_HEADER_USER_EMAIL, user.email);
  requestHeaders.set(X_HEADER_USER_NAME, user.username);
  requestHeaders.set(X_HEADER_USER_ROLE, user.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/api/course",
    "/api/course/:path*",
    "/api/user",
    "/api/user/:path*",
  ],
};
