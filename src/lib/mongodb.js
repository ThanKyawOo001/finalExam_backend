// src/lib/mongodb.js

import { MongoClient } from "mongodb";

const options = {};
let globalClientPromise;

// Reuse one connection per server instance (dev and production). Opening a
// new connection on every request adds seconds of latency on Vercel.
export function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please add your Mongo URI to .env.local or set MONGODB_URI env variable",
    );
  }
  if (!globalClientPromise) {
    const client = new MongoClient(uri, options);
    globalClientPromise = client.connect().catch((error) => {
      // Allow a retry on the next request if the connection failed
      globalClientPromise = undefined;
      throw error;
    });
  }
  return globalClientPromise;
}
