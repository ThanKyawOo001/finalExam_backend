import jwt from "jsonwebtoken";
import {
  ROLE_STUDENT,
  ROLE_TEACHER,
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_ROLE,
} from "./constant";

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyJWT(req) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    console.log(err);
    return null;
  }
}

// Read the user that proxy.js attached to the request headers
export function getRequestUser(req) {
  const id = req.headers.get(X_HEADER_USER_ID);
  if (!id) return null;
  return {
    id: id,
    email: req.headers.get(X_HEADER_USER_EMAIL),
    username: req.headers.get(X_HEADER_USER_NAME),
    role: req.headers.get(X_HEADER_USER_ROLE),
  };
}

export function isTeacher(user) {
  return user?.role === ROLE_TEACHER;
}

export function isStudent(user) {
  return user?.role === ROLE_STUDENT;
}
