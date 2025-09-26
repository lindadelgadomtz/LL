import mongoose from "mongoose";

const { MONGODB_URI = "" } = process.env;

if (!MONGODB_URI) {
    console.warn("⚠️  MONGODB_URI is not set. DB calls will fail.");
}

export async function connectMongo() {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGODB_URI);
}
