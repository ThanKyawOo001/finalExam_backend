# How to Test the App

Online Course Service: Next.js backend API + React (Vite) frontend + MongoDB.

## Student Information

- **Student Name:**
- **Student ID:**

## Links

| | Repository | Deployed URL |
|---|---|---|
| Backend (Next.js) | _repo link_ | _https://your-backend.vercel.app_ |
| Frontend (React) | _repo link_ | _https://your-frontend.vercel.app_ |

## Test Credentials

Log in with either the **username** or the **email**.

| Role | Username | Email | Password |
|---|---|---|---|
| Teacher | `teacher1` | `teacher1@test.com` | `teacher1234` |
| Teacher | `teacher2` | `teacher2@test.com` | `teacher1234` |
| Teacher | `teacher3` | `teacher3@test.com` | `teacher1234` |
| Student | `student1` | `student1@test.com` | `student1234` |
| Student | `student2` | `student2@test.com` | `student1234` |
| Student | `student3` | `student3@test.com` | `student1234` |

These users (and five sample courses) are created by `npm run seed` in the backend.

## Prerequisites

- Node.js 20.6+ (tested with Node 25)
- A MongoDB database (MongoDB Atlas free tier or local `mongod`)

## How to Run & Test

### 1. Backend Setup (`next-backend/`)

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   ```
   MONGODB_URI=mongodb+srv://...
   DB_NAME=wad_final
   JWT_SECRET=<any long random string>
   ```
3. `npm run seed` creates the 3 Teachers, 3 Students and sample courses
   (`npm run seed:reset` deletes all courses first and seeds again).
4. `npm run dev` starts the API on http://localhost:3000

### 2. Frontend Setup (`react-frontend/`)

1. `npm install`
2. Create `.env.development` with `VITE_API_URL=http://localhost:3000`
3. `npm run dev` starts the app on http://localhost:5173 (must be port 5173, CORS allows only that origin in development)

### 3. Testing Walkthrough

**Teacher**
1. Log in as `teacher1` / `teacher1234`. "My Courses" lists only teacher1's own courses.
2. Click **New Course**, fill in name, duration (days), price, max student, status and one or more topics, then **Create Course**.
3. Click a course row to open its details, including the **Enrolled Students** table.
4. Click **Edit** to change any field or the status (Open / Close / Cancel).
5. **Delete** works only while no student is enrolled (the button is disabled otherwise and the API returns 409).
6. Log in as `teacher2`: teacher1's courses are not listed, and opening one by URL returns *403 You can only view your own courses*.

**Student**
1. Log in as `student1` / `student1234`. "All Courses" shows every course except those with status **Cancel** (e.g. "Old Java Course" is hidden).
2. Type in the search box to filter by part of a course name (`python`) or teacher name (`teacher3`).
3. Open "Web Application Development" (Open) and click **Enroll**. Clicking again is not possible, and the API rejects a second enrollment (409).
4. "Intro to MongoDB" has status **Close**: it is visible, but Enroll is disabled and the API rejects it.
5. "UX Design Basics" has Max Student = 1: enroll with `student1`, then log in as `student2`. The course shows *This course is full* and the API rejects the enrollment.
6. **Enrolled** in the top bar lists the courses the student is enrolled in.
7. Log back in as the teacher and open the course: the student appears in **Enrolled Students**, and Delete is disabled.

## API Summary

All endpoints except `/api/auth/*` require the `token` httpOnly cookie set at login (JWT checked in `src/proxy.js`). Requests without it get **401**. Role, ownership, enrollment and status rules are checked inside each route, not just in the UI.

| Method | Endpoint | Who | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` (email or username); sets cookie |
| GET/POST | `/api/auth/logout` | public | Clears cookie |
| GET | `/api/user` | any | Current user profile |
| GET | `/api/user/:user_id` | self / owning teacher | User profile (no password) |
| GET | `/api/course?q=` | Teacher | Own courses, filter by name |
| GET | `/api/course?q=&enrolled=true` | Student | Non-cancelled courses, filter by course or teacher name; `enrolled=true` returns only enrolled courses |
| POST | `/api/course` | Teacher | Create course |
| GET | `/api/course/:course_id` | owner Teacher / Student | Details; the owner also gets the `students` list |
| PUT | `/api/course/:course_id` | owner Teacher | Update; Max Student cannot go below the enrolled count |
| DELETE | `/api/course/:course_id` | owner Teacher | Only when no student is enrolled |
| POST | `/api/course/:course_id/enroll` | Student | Only if Open, a seat is left and not already enrolled (one atomic update) |

Course document: `name, duration, topics[], price, maxStudent, status (Open|Close|Cancel), teacherId, teacherName, students[{studentId, username, email, enrolledAt}]`.

## Deployment (Vercel)

**Backend project** (root = backend repo), Environment Variables:
- `MONGODB_URI`, `DB_NAME`, `JWT_SECRET`
- `FRONTEND_URL` = deployed frontend URL, e.g. `https://your-frontend.vercel.app` (no trailing slash; used for CORS)

**Frontend project** (root = frontend repo, framework preset Vite), Environment Variables:
- `VITE_API_URL` = deployed backend URL, e.g. `https://your-backend.vercel.app` (no trailing slash)

In production the login cookie is sent with `SameSite=None; Secure` so it works across the two domains. If Atlas is used, allow access from `0.0.0.0/0` in Network Access. Safari blocks cross-site cookies by default; test with Chrome or Firefox.
