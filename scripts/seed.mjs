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
    {
        name: "Benelux Cold Chain",
        verified: true,
        rating: 4.5,
        types: ["reefer", "truck"],
        lanes: [
            { origin: "NL", destination: "BE" },
            { origin: "NL", destination: "DE" },
        ],
        description: "Temperature-controlled freight across Benelux and Germany.",
        contact: { email: "ops@beneluxcold.example", website: "#" },
        logoEmoji: "❄️",
    },
    {
        name: "Rhine Container Transit",
        verified: true,
        rating: 4.4,
        types: ["container"],
        lanes: [
            { origin: "DE", destination: "NL" },
            { origin: "DE", destination: "GB" },
        ],
        description: "Container drayage and linehaul on core Rhine corridors.",
        contact: { phone: "+49 30 1234 5678", website: "#" },
        logoEmoji: "📦",
    },
    {
        name: "Mediterraneo Tanker Logistics",
        verified: true,
        rating: 4.6,
        types: ["tanker", "truck"],
        lanes: [
            { origin: "IT", destination: "ES" },
            { origin: "IT", destination: "FR" },
        ],
        description: "Bulk liquid transport with ADR-certified fleet.",
        contact: { email: "dispatch@medtanker.example", website: "#" },
        logoEmoji: "🛢️",
    },
    {
        name: "Vistula Flatbed & Steel",
        verified: true,
        rating: 4.3,
        types: ["flatbed", "truck"],
        lanes: [
            { origin: "PL", destination: "DE" },
            { origin: "PL", destination: "NL" },
        ],
        description: "Flatbed specialist for steel and oversized loads.",
        contact: { phone: "+48 22 555 66 77", website: "#" },
        logoEmoji: "🏗️",
    }
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
