// src/lib/course.js

import { COURSE_STATUS } from "./constant";

// Validate the course body sent by the client.
// Returns { error } or { course } with clean, typed fields.
export function parseCourseInput(data) {
  if (!data || typeof data !== "object") {
    return { error: "Invalid request body" };
  }
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const duration = Number(data.duration);
  const price = Number(data.price);
  const maxStudent = Number(data.maxStudent);
  const status = data.status;

  let topics = data.topics;
  if (typeof topics === "string") {
    topics = topics.split(",");
  }
  if (!Array.isArray(topics)) {
    return { error: "Topics must be a list" };
  }
  topics = topics.map((topic) => String(topic).trim()).filter(Boolean);

  if (!name) return { error: "Course name is required" };
  if (!Number.isInteger(duration) || duration <= 0)
    return { error: "Duration must be a positive whole number of days" };
  if (topics.length === 0) return { error: "At least one topic is required" };
  if (!Number.isFinite(price) || price < 0)
    return { error: "Price must be zero or more" };
  if (!Number.isInteger(maxStudent) || maxStudent <= 0)
    return { error: "Max Student must be a positive whole number" };
  if (!COURSE_STATUS.includes(status))
    return { error: `Status must be one of ${COURSE_STATUS.join(", ")}` };

  return {
    course: { name, duration, topics, price, maxStudent, status },
  };
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Shape a course document for the requesting user. Only the owning teacher
// gets the list of enrolled students.
export function courseOutput(course, user) {
  const students = course.students || [];
  const output = {
    _id: course._id,
    name: course.name,
    duration: course.duration,
    topics: course.topics,
    price: course.price,
    maxStudent: course.maxStudent,
    status: course.status,
    teacherId: course.teacherId,
    teacherName: course.teacherName,
    enrolledCount: students.length,
    seatsLeft: Math.max(course.maxStudent - students.length, 0),
    isEnrolled: students.some((s) => s.studentId === user.id),
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
  if (course.teacherId === user.id) {
    output.students = students;
  }
  return output;
}
