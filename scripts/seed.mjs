import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";

const { MONGODB_URI } = process.env;

const LaneSchema = new mongoose.Schema({ origin: String, destination: String }, { _id: false });
const CarrierSchema = new mongoose.Schema({
    name: String, verified: Boolean, rating: Number,
    types: [String], lanes: [LaneSchema],
    description: String,
    contact: { email: String, phone: String, website: String },
    logoEmoji: String,
});
const Carrier = mongoose.models.Carrier || mongoose.model("Carrier", CarrierSchema);

const data = [
    {
        name: "Alpine Logistics",
        verified: true,
        rating: 4.7,
        types: ["truck", "reefer"],
        lanes: [{ origin: "FR", destination: "ES" }, { origin: "FR", destination: "DE" }],
        description: "EU road freight with temperature control.",
        contact: { email: "hello@alpine.example", phone: "+33 1 23 45 67 89", website: "#" },
        logoEmoji: "⛰️",
    },
    {
        name: "Iberia Freight",
        verified: true,
        rating: 4.6,
        types: ["truck", "flatbed"],
        lanes: [{ origin: "ES", destination: "FR" }, { origin: "PT", destination: "ES" }],
        description: "Iberian peninsula specialists.",
        contact: { phone: "+34 91 000 22 33", website: "#" },
        logoEmoji: "🚛",
    },
];

async function run() {
    if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await Carrier.deleteMany({});
    await Carrier.insertMany(data);
    console.log("✅ Seeded carriers:", data.length);
    await mongoose.disconnect();
}

run().catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
});
