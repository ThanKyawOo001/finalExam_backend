//src/app/api/user/route.js

import { getRequestUser } from "@/lib/auth";
import { getClientPromise } from "@/lib/mongodb";
import {
  errorResponse,
  getDb,
  optionsResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";
import { ObjectId } from "mongodb";

export async function OPTIONS() {
  return optionsResponse();
}

// GET /api/user -> profile of the logged-in user
export async function GET(request) {
  const requestUser = getRequestUser(request);
  if (!requestUser) {
    return errorResponse("Unauthorized Request", 401);
  }
  try {
    const client = await getClientPromise();
    const db = getDb(client);
    const user = await db
      .collection("user")
      .findOne(
        { _id: new ObjectId(requestUser.id) },
        { projection: { password: 0 } },
      );
    if (!user) {
      return errorResponse("User not found", 404);
    }
    return successResponse({ user }, 200);
  } catch (error) {
    printExceptionLog("GET User", error);
    return errorResponse("GET User Internal Error", 500);
  }
}
