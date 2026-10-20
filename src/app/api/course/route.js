//src/app/api/course/route.js

import { getRequestUser, isStudent, isTeacher } from "@/lib/auth";
import { STATUS_CANCEL } from "@/lib/constant";
import { courseOutput, escapeRegex, parseCourseInput } from "@/lib/course";
import { getClientPromise } from "@/lib/mongodb";
import {
  errorResponse,
  getDb,
  optionsResponse,
  printExceptionLog,
  successResponse,
} from "@/lib/utils";

export async function OPTIONS() {
  return optionsResponse();
}

/**
 * GET /api/course
 *  Teacher: own courses only. ?q= filters by course name.
 *  Student: every course except Cancel. ?q= filters by course name or teacher name.
 *           ?enrolled=true returns only the courses the student is enrolled in.
 */
export async function GET(request) {
  const user = getRequestUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const q = (searchParams.get("q") || "").trim();
  const enrolledOnly = searchParams.get("enrolled") === "true";

  let filter;
  if (isTeacher(user)) {
    filter = { teacherId: user.id };
    if (q) {
      filter.name = { $regex: escapeRegex(q), $options: "i" };
    }
  } else if (isStudent(user)) {
    if (enrolledOnly) {
      filter = { "students.studentId": user.id };
    } else {
      filter = { status: { $ne: STATUS_CANCEL } };
    }
    if (q) {
      const regex = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [{ name: regex }, { teacherName: regex }];
    }
  } else {
    return errorResponse("Forbidden", 403);
  }

  try {
    const client = await getClientPromise();
    const db = getDb(client);
    const result = await db
      .collection("course")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    const courseList = result.map((course) => courseOutput(course, user));
    return successResponse({ courseList }, 200);
  } catch (error) {
    printExceptionLog("GET Course", error);
    return errorResponse("GET Course Internal Error", 500);
  }
}

/**
 * POST /api/course  (Teacher only)
 */
export async function POST(request) {
  const user = getRequestUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401);
  }
  if (!isTeacher(user)) {
    return errorResponse("Only teachers can create courses", 403);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }
  const { error, course } = parseCourseInput(data);
  if (error) {
    return errorResponse(error, 400);
  }

  try {
    const client = await getClientPromise();
    const db = getDb(client);
    const now = new Date();
    const insertResult = await db.collection("course").insertOne({
      ...course,
      teacherId: user.id,
      teacherName: user.username,
      students: [],
      createdAt: now,
      updatedAt: now,
    });
    return successResponse({ id: insertResult.insertedId }, 201);
  } catch (error) {
    printExceptionLog("POST Course", error);
    return errorResponse("POST Course Internal Error", 500);
  }
}
