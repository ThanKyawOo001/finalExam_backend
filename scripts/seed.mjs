// scripts/seed.mjs
// Creates the test users (3 Students, 3 Teachers) and a few sample courses.
// Run: npm run seed        (reads MONGODB_URI and DB_NAME from .env.local)
//      npm run seed:reset  (also deletes ALL courses first)

import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
if (!uri || !dbName) {
  console.error("MONGODB_URI and DB_NAME must be set (see .env.example)");
  process.exit(1);
}

const users = [
  { username: "teacher1", email: "teacher1@test.com", password: "teacher1234", role: "Teacher" },
  { username: "teacher2", email: "teacher2@test.com", password: "teacher1234", role: "Teacher" },
  { username: "teacher3", email: "teacher3@test.com", password: "teacher1234", role: "Teacher" },
  { username: "student1", email: "student1@test.com", password: "student1234", role: "Student" },
  { username: "student2", email: "student2@test.com", password: "student1234", role: "Student" },
  { username: "student3", email: "student3@test.com", password: "student1234", role: "Student" },
];

const sampleCourses = {
  teacher1: [
    { name: "Web Application Development", duration: 30, topics: ["HTML", "React", "Next.js"], price: 4500, maxStudent: 3, status: "Open" },
    { name: "Intro to MongoDB", duration: 7, topics: ["Documents", "Queries", "Indexes"], price: 1500, maxStudent: 2, status: "Close" },
  ],
  teacher2: [
    { name: "Python for Data Science", duration: 21, topics: ["Pandas", "NumPy", "Matplotlib"], price: 3900, maxStudent: 5, status: "Open" },
    { name: "Old Java Course", duration: 14, topics: ["OOP", "Collections"], price: 2000, maxStudent: 10, status: "Cancel" },
  ],
  teacher3: [
    { name: "UX Design Basics", duration: 10, topics: ["Research", "Wireframes", "Prototyping"], price: 2500, maxStudent: 1, status: "Open" },
  ],
};

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(dbName);
  if (process.argv.includes("--reset")) {
    const { deletedCount } = await db.collection("course").deleteMany({});
    console.log(`reset: ${deletedCount} course(s) deleted`);
  }
  await db.collection("user").createIndex({ email: 1 }, { unique: true });
  await db.collection("user").createIndex({ username: 1 }, { unique: true });

  const idByUsername = {};
  for (const u of users) {
    const { password, ...rest } = u;
    const result = await db.collection("user").findOneAndUpdate(
      { email: u.email },
      { $set: { ...rest, password: await bcrypt.hash(password, 12) } },
      { upsert: true, returnDocument: "after" },
    );
    idByUsername[u.username] = String(result._id);
    console.log(`user ${u.username} (${u.role}) ready`);
  }

  for (const [teacherName, courses] of Object.entries(sampleCourses)) {
    const teacherId = idByUsername[teacherName];
    const existing = await db.collection("course").countDocuments({ teacherId });
    if (existing > 0) {
      console.log(`${teacherName} already has courses, skipped`);
      continue;
    }
    const now = new Date();
    await db.collection("course").insertMany(
      courses.map((c) => ({ ...c, teacherId, teacherName, students: [], createdAt: now, updatedAt: now })),
    );
    console.log(`${courses.length} course(s) created for ${teacherName}`);
  }
  console.log("Seed complete");
} finally {
  await client.close();
}
