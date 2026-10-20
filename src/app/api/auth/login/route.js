//src/app/api/auth/login/route.js

import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import {
  errorResponse,
  getDb,
  optionsResponse,
  printExceptionLog,
} from "@/lib/utils";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(req) {
  let data;
  try {
    data = await req.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }
  // "email" may contain either the email or the username
  const email = data.email?.trim();
  const password = data.password;
  if (!email || !password) {
    return errorResponse("Missing email or password", 400);
  }

  const user = await checkUser(email, password);
  if (!user) {
    return errorResponse("Invalid email or password", 401);
  }

  const token = getJwtToken(user);
  const response = NextResponse.json(
    {
      message: "Login successful",
      token: token,
    },
    {
      status: 200,
      headers: corsHeaders,
    },
  );
  response.cookies.set("token", token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV == "development" ? "lax" : "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

async function checkUser(email, password) {
  try {
    const client = await getClientPromise();
    const db = getDb(client);
    const user = await db
      .collection("user")
      .findOne({ $or: [{ email: email }, { username: email }] });

    if (!user) return false;
    const check = await bcrypt.compare(password, user.password);
    return check ? user : false;
  } catch (error) {
    printExceptionLog("Login checkUser", error);
    return false;
  }
}

function getJwtToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      email: user.email,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}
