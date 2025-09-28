// src/lib/db.ts
import mongoose, { type Mongoose } from "mongoose";

type Cached = { conn: Mongoose | null; promise: Promise<Mongoose> | null };

declare global {
    var _mongoose: Cached | undefined;
}

const cached = (globalThis._mongoose ??= { conn: null, promise: null });

export async function dbConnect(): Promise<Mongoose> {
    if (cached.conn) return cached.conn;

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("Missing MONGODB_URI");

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
