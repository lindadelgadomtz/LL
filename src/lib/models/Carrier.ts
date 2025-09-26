import { Schema, model, models } from "mongoose";

const LaneSchema = new Schema(
    { origin: { type: String, index: true }, destination: { type: String, index: true } },
    { _id: false }
);

const CarrierSchema = new Schema(
    {
        name: { type: String, required: true },
        verified: { type: Boolean, default: false },
        rating: Number,
        types: [{ type: String, index: true }], // "truck" | "reefer" | "container" | ...
        lanes: [LaneSchema],                     // [{ origin:"FR", destination:"ES" }]
        description: String,
        contact: { email: String, phone: String, website: String },
        logoEmoji: String,
    },
    { timestamps: true }
);

// Speed up the 3-filter query
CarrierSchema.index({ "lanes.origin": 1, "lanes.destination": 1, types: 1 });

export type CarrierDoc = typeof CarrierSchema extends infer T ? any : any;
export default models.Carrier || model("Carrier", CarrierSchema);
