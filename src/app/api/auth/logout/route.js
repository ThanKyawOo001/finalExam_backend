//src/app/api/auth/logout/route.js

import corsHeaders from "@/lib/cors";
import { optionsResponse } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  const response = NextResponse.json(
    {
      message: "Logout successful",
    },
    {
      status: 200,
      headers: corsHeaders,
    },
  );
  response.cookies.set("token", "", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV == "development" ? "lax" : "none",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function POST() {
  return GET();
}
