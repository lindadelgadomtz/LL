// src/lib/models/Carrier.ts
import {
    Schema,
    model,
    models,
    type InferSchemaType,
    type HydratedDocument,
    type Model,
} from "mongoose";

const LaneSchema = new Schema(
    {
        origin: { type: String, index: true },
        destination: { type: String, index: true },
    },
    { _id: false }
);

const CarrierSchema = new Schema(
    {
        name: { type: String, required: true },
        verified: { type: Boolean, default: false },
        rating: Number,
        types: [{ type: String, index: true }], // "truck" | "reefer" | ...
        lanes: [LaneSchema],                     // [{ origin:"FR", destination:"ES" }]
        description: String,
        contact: { email: String, phone: String, website: String },
        logoEmoji: String,
    },
    { timestamps: true }
);

// Speed up the 3-filter query
CarrierSchema.index({ "lanes.origin": 1, "lanes.destination": 1, types: 1 });

// ✅ Strong, lint-clean types
export type Carrier = InferSchemaType<typeof CarrierSchema>;
export type CarrierDoc = HydratedDocument<Carrier>;

// ✅ Typed model export
const CarrierModel: Model<Carrier> =
    (models.Carrier as Model<Carrier>) || model<Carrier>("Carrier", CarrierSchema);

export default CarrierModel;
