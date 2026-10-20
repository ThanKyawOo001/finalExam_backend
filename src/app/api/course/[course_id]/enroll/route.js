//src/app/api/course/[course_id]/enroll/route.js

import { getRequestUser, isStudent } from "@/lib/auth";
import { STATUS_CANCEL, STATUS_OPEN } from "@/lib/constant";
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

/**
 * POST /api/course/:course_id/enroll  (Student only)
 * Allowed only when status is Open, a seat is left and the student
 * is not enrolled yet. All three rules are checked in one atomic update.
 */
export async function POST(request, { params }) {
  const user = getRequestUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401);
  }
  if (!isStudent(user)) {
    return errorResponse("Only students can enroll in courses", 403);
  }
  const { course_id } = await params;
  if (!ObjectId.isValid(course_id)) {
    return errorResponse("Invalid course id", 400);
  }

  try {
    const client = await getClientPromise();
    const db = getDb(client);
    const courseId = new ObjectId(course_id);

    const updateResult = await db.collection("course").updateOne(
      {
        _id: courseId,
        status: STATUS_OPEN,
        "students.studentId": { $ne: user.id },
        $expr: {
          $lt: [{ $size: { $ifNull: ["$students", []] } }, "$maxStudent"],
        },
      },
      {
        $push: {
          students: {
            studentId: user.id,
            username: user.username,
            email: user.email,
            enrolledAt: new Date(),
          },
        },
      },
    );

    if (updateResult.modifiedCount > 0) {
      return successResponse({ message: "Enroll success" }, 200);
    }

    // Work out why the enrollment was rejected
    const course = await db.collection("course").findOne({ _id: courseId });
    if (!course || course.status === STATUS_CANCEL) {
      return errorResponse("Course not found", 404);
    }
    const students = course.students || [];
    if (students.some((s) => s.studentId === user.id)) {
      return errorResponse("You are already enrolled in this course", 409);
    }
    if (course.status !== STATUS_OPEN) {
      return errorResponse("This course is not open for enrollment", 400);
    }
    if (students.length >= course.maxStudent) {
      return errorResponse("This course is full", 400);
    }
    return errorResponse("Enroll failed", 400);
  } catch (error) {
    printExceptionLog("POST Enroll", error);
    return errorResponse("POST Enroll Internal Error", 500);
  }
}
