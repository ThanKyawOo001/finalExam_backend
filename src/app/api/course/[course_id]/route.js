//src/app/api/course/[course_id]/route.js

import { getRequestUser, isStudent, isTeacher } from "@/lib/auth";
import { STATUS_CANCEL } from "@/lib/constant";
import { courseOutput, parseCourseInput } from "@/lib/course";
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
 * GET /api/course/:course_id
 *  Teacher: own course only, includes the enrolled students.
 *  Student: any course that is not Cancel (or one they are already enrolled in).
 */
export async function GET(request, { params }) {
  const user = getRequestUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401);
  }
  const { course_id } = await params;
  if (!ObjectId.isValid(course_id)) {
    return errorResponse("Invalid course id", 400);
  }

  try {
    const client = await getClientPromise();
    const db = getDb(client);
    const course = await db
      .collection("course")
      .findOne({ _id: new ObjectId(course_id) });
    if (!course) {
      return errorResponse("Course not found", 404);
    }

    if (isTeacher(user)) {
      if (course.teacherId !== user.id) {
        return errorResponse("You can only view your own courses", 403);
      }
    } else if (isStudent(user)) {
      const enrolled = (course.students || []).some(
        (s) => s.studentId === user.id,
      );
      if (course.status === STATUS_CANCEL && !enrolled) {
        return errorResponse("Course not found", 404);
      }
    } else {
      return errorResponse("Forbidden", 403);
    }

    return successResponse({ course: courseOutput(course, user) }, 200);
  } catch (error) {
    printExceptionLog("GET Course by id", error);
    return errorResponse("GET Course Internal Error", 500);
  }
}

/**
 * PUT /api/course/:course_id  (owning Teacher only)
 */
export async function PUT(request, { params }) {
  const user = getRequestUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401);
  }
  if (!isTeacher(user)) {
    return errorResponse("Only teachers can update courses", 403);
  }
  const { course_id } = await params;
  if (!ObjectId.isValid(course_id)) {
    return errorResponse("Invalid course id", 400);
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
    const stored = await db
      .collection("course")
      .findOne({ _id: new ObjectId(course_id) });
    if (!stored) {
      return errorResponse("Course not found", 404);
    }
    if (stored.teacherId !== user.id) {
      return errorResponse("You can only update your own courses", 403);
    }

    // The max student check is part of the update filter so a student
    // enrolling at the same moment cannot push the count over the new limit.
    const updateResult = await db.collection("course").updateOne(
      {
        _id: new ObjectId(course_id),
        teacherId: user.id,
        $expr: {
          $lte: [{ $size: { $ifNull: ["$students", []] } }, course.maxStudent],
        },
      },
      { $set: { ...course, updatedAt: new Date() } },
    );
    if (updateResult.matchedCount === 0) {
      return errorResponse(
        "Max Student cannot be less than the number of enrolled students",
        400,
      );
    }
    return successResponse({ message: "Course update success" }, 200);
  } catch (error) {
    printExceptionLog("PUT Course", error);
    return errorResponse("PUT Course Internal Error", 500);
  }
}

/**
 * DELETE /api/course/:course_id  (owning Teacher only, no enrolled students)
 */
export async function DELETE(request, { params }) {
  const user = getRequestUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401);
  }
  if (!isTeacher(user)) {
    return errorResponse("Only teachers can delete courses", 403);
  }
  const { course_id } = await params;
  if (!ObjectId.isValid(course_id)) {
    return errorResponse("Invalid course id", 400);
  }

  try {
    const client = await getClientPromise();
    const db = getDb(client);
    const stored = await db
      .collection("course")
      .findOne({ _id: new ObjectId(course_id) });
    if (!stored) {
      return errorResponse("Course not found", 404);
    }
    if (stored.teacherId !== user.id) {
      return errorResponse("You can only delete your own courses", 403);
    }

    // Empty-students condition in the filter makes the check atomic
    const deleteResult = await db.collection("course").deleteOne({
      _id: new ObjectId(course_id),
      teacherId: user.id,
      $or: [{ students: { $exists: false } }, { students: { $size: 0 } }],
    });
    if (deleteResult.deletedCount === 0) {
      return errorResponse(
        "Cannot delete a course that has enrolled students",
        409,
      );
    }
    return successResponse({ message: "Delete Success" }, 200);
  } catch (error) {
    printExceptionLog("DELETE Course", error);
    return errorResponse("DELETE Course Internal Error", 500);
  }
}
