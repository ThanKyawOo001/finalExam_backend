// src/lib/utils.js

import { NextResponse } from "next/server";
import corsHeaders from "./cors";

export function printExceptionLog(logMessage, error) {
  console.log(`==>${logMessage} Exception`);
  console.log(error);
}

export function errorResponse(message, status) {
  return NextResponse.json(
    {
      message: message,
    },
    {
      status: status,
      headers: corsHeaders,
    },
  );
}

export function successResponse(jsonData, status) {
  return NextResponse.json(jsonData, {
    status: status,
    headers: corsHeaders,
  });
}

export function optionsResponse() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export function getDb(client) {
  return client.db(process.env.DB_NAME);
}
