//src/app/api/user/[user_id]/route.js

import { getRequestUser, isTeacher } from "@/lib/auth";
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

// GET /api/user/:user_id -> a user can view themself, a teacher can view
// students enrolled in one of their own courses
export async function GET(request, { params }) {
  const requestUser = getRequestUser(request);
  if (!requestUser) {
    return errorResponse("Unauthorized Request", 401);
  }
  const { user_id } = await params;
  if (!ObjectId.isValid(user_id)) {
    return errorResponse("Invalid user id", 400);
  }
  try {
    const client = await getClientPromise();
    const db = getDb(client);

    if (user_id !== requestUser.id) {
      const allowed =
        isTeacher(requestUser) &&
        (await db.collection("course").findOne({
          teacherId: requestUser.id,
          "students.studentId": user_id,
        }));
      if (!allowed) {
        return errorResponse("Forbidden", 403);
      }
    }

    const user = await db
      .collection("user")
      .findOne({ _id: new ObjectId(user_id) }, { projection: { password: 0 } });
    if (!user) {
      return errorResponse("User not found", 404);
    }
    return successResponse({ user }, 200);
  } catch (error) {
    printExceptionLog("GET User by id", error);
    return errorResponse("GET User Internal Error", 500);
  }
}
