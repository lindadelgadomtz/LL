// lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

type Cached = {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
};

let cached = (global as any)._mongoose as Cached | undefined;
if (!cached) {
    cached = (global as any)._mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
    if (cached!.conn) return cached!.conn;
    if (!cached!.promise) {
        cached!.promise = mongoose
            .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
            .then((m) => m);
    }
    cached!.conn = await cached!.promise;
    return cached!.conn;
}
