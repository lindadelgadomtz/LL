// app/api/search/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import mongoose, { Types } from "mongoose";
import Ajv, { JSONSchemaType } from "ajv";
import { dbConnect } from "@/src/lib/db";

/** Small helper; we now actually use it to avoid the unused warning */
function sanitizeJsonString(s: string) {
    if (!s) return s;
    s = s.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
    const lastBrace = s.lastIndexOf("}");
    const lastBracket = s.lastIndexOf("]");
    const cut = Math.max(lastBrace, lastBracket);
    if (cut > 0) s = s.slice(0, cut + 1);
    return s;
}

export const runtime = "nodejs";

/* -------------------- ENV -------------------- */
const {
    OPENAI_API_KEY,
    OPENAI_MODEL = "gpt-4.1-mini",
    AI_FALLBACK_ENABLED = "true",
} = process.env;

/* -------------------- Domain types -------------------- */
type TransportType = "truck" | "reefer" | "container" | "flatbed" | "tanker";

interface Lane {
    origin: string;
    destination: string;
}
interface Contact {
    email?: string;
    phone?: string;
    website?: string;
}

/** What we accept back from the AI (strict) */
interface AICarrier {
    id: string;
    name: string;
    types: TransportType[];
    lanes: Lane[];
    description?: string;
    logoEmoji?: string;
}
interface AICarriersResponse {
    items: AICarrier[];
}

/** What we send to the UI (DB or AI) */
interface CarrierOut extends AICarrier {
    verified: boolean;
    rating?: number;
    contact?: Contact;
    source: "db" | "ai";
    confidence?: number; // only for AI
}

/* -------------------- Mongoose models -------------------- */
const LaneSchema = new mongoose.Schema<Lane>(
    { origin: String, destination: String },
    { _id: false }
);

interface CarrierDoc {
    _id: Types.ObjectId;
    name: string;
    verified: boolean;
    rating?: number;
    types: TransportType[];
    lanes: Lane[];
    description?: string;
    contact?: Contact;
    logoEmoji?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const CarrierSchema = new mongoose.Schema<CarrierDoc>(
    {
        name: { type: String, required: true },
        verified: { type: Boolean, default: false },
        rating: Number,
        types: [String],
        lanes: [LaneSchema],
        description: String,
        contact: { email: String, phone: String, website: String },
        logoEmoji: String,
    },
    { timestamps: true }
);

CarrierSchema.index({ "lanes.origin": 1, "lanes.destination": 1, types: 1 });

type CarrierModel = mongoose.Model<CarrierDoc>;
const Carrier =
    (mongoose.models.Carrier as CarrierModel) ||
    mongoose.model<CarrierDoc>("Carrier", CarrierSchema);

/* -------------------- AJV schema & validator -------------------- */
const carriersJsonSchema: JSONSchemaType<AICarriersResponse> = {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
        items: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "name", "types", "lanes"],
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    types: {
                        type: "array",
                        items: {
                            type: "string",
                            enum: ["truck", "reefer", "container", "flatbed", "tanker"],
                        },
                    },
                    lanes: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["origin", "destination"],
                            properties: {
                                origin: { type: "string" },
                                destination: { type: "string" },
                            },
                        },
                    },
                    description: { type: "string", nullable: true },
                    logoEmoji: { type: "string", nullable: true },
                },
            },
        },
    },
};

const ajv = new Ajv({ removeAdditional: "all", allErrors: true });
const validateCarriers = ajv.compile<AICarriersResponse>(carriersJsonSchema);

/* -------------------- Stub suggestion -------------------- */
function stubSuggestion(params: {
    type?: string;
    origin?: string;
    destination?: string;
}): CarrierOut[] {
    const { type, origin, destination } = params;
    return [
        {
            id: `ai-stub-${Date.now()}`,
            name: "Regional Carrier Suggestion",
            verified: false,
            types: (type ? [type] : ["truck"]) as TransportType[],
            lanes: [{ origin: origin || "FR", destination: destination || "ES" }],
            description: "Unverified suggestion based on similar lanes in the region.",
            logoEmoji: "🧭",
            source: "ai",
            confidence: 0.55,
        },
    ];
}

/* -------------------- Simple in-memory rate limit for AI calls -------------------- */
const aiWindowMs = 60_000;
const aiMaxCalls = 20;
const aiBucket: Map<string, { count: number; since: number }> = new Map();

function allowAiCall(key: string) {
    const now = Date.now();
    const b = aiBucket.get(key) ?? { count: 0, since: now };
    if (now - b.since > aiWindowMs) {
        b.count = 0;
        b.since = now;
    }
    b.count++;
    aiBucket.set(key, b);
    return b.count <= aiMaxCalls;
}

/* -------------------- AI Fallback with guardrails -------------------- */
const MIN_FILTERS_FOR_AI = 2;

async function aiFallback(
    params: { type?: string; origin?: string; destination?: string },
    rateKey: string
): Promise<CarrierOut[]> {
    const { type, origin, destination } = params;

    const stub = (reason: string): CarrierOut[] => {
        console.warn("AI: returning stub —", reason, { type, origin, destination });
        return stubSuggestion(params);
    };

    // Toggle via env var we destructured above
    if (AI_FALLBACK_ENABLED !== "true") return stub("ai_disabled");

    // Require ≥ 2 filters
    const filled = [type, origin, destination].filter(Boolean).length;
    if (filled < MIN_FILTERS_FOR_AI) return stub(`min_filters(${filled})`);

    // Rate limit
    if (!allowAiCall(rateKey)) return stub("rate_limited");

    // Key check
    if (!OPENAI_API_KEY) return stub("no_key");

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const system =
        "You are LaneList's matching engine. Produce plausible, generic EU carrier suggestions. " +
        "Never invent real contact info. Output only structured data.";

    const user =
        `Filters:
- type: ${type || "ANY"}
- origin: ${origin || "ANY"}
- destination: ${destination || "ANY"}
Return at most 5 items. Keep descriptions ≤ 120 chars. No newlines in fields.`;

    /* ---------- 1) Function calling (tools) ---------- */
    try {
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user + " Use the function 'return_carriers'." },
            ],
            tools: [
                {
                    type: "function",
                    function: {
                        name: "return_carriers",
                        description: "Return carrier suggestions as structured JSON.",
                        parameters: carriersJsonSchema as unknown as Record<string, unknown>,
                    },
                },
            ],
            tool_choice: { type: "function", function: { name: "return_carriers" } },
            temperature: 0.2,
            max_tokens: 450,
        });

        // Narrow tool_calls without using 'any'
        interface FunctionToolCall {
            type: "function";
            id?: string;
            function: { name: string; arguments: string };
        }
        const toolCalls =
            (completion.choices?.[0]?.message?.tool_calls as unknown as
                | FunctionToolCall[]
                | undefined) ?? [];

        const fnCall = toolCalls.find((tc) => tc.type === "function");
        if (!fnCall) throw new Error("no_function_tool_call");

        const argText = fnCall.function.arguments;
        if (!argText) throw new Error("no_tool_call_arguments");

        const parsed = JSON.parse(argText) as unknown;

        if (!validateCarriers(parsed)) {
            console.error("AI: Ajv errors (tools):", validateCarriers.errors);
            throw new Error("ajv_validation_failed_tools");
        }
        const items = (parsed as AICarriersResponse).items;

        const mapped: CarrierOut[] = items.slice(0, 5).map((x) => ({
            ...x,
            verified: false,
            source: "ai",
            confidence: 0.55,
        }));

        if (mapped.length > 0) {
            console.log("AI: tools suggestions:", mapped.length);
            return mapped;
        }
        return stub("empty_model_output(tools)");
    } catch (err) {
        console.error("AI: tools call failed, degrading:", err);
    }

    /* ---------- 2) Strict json_schema ---------- */
    try {
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: system },
                {
                    role: "user",
                    content:
                        user +
                        ` JSON shape:
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "types": ["truck"|"reefer"|"container"|"flatbed"|"tanker"],
      "lanes": [{"origin":"CC","destination":"CC"}],
      "description": "string",
      "logoEmoji": "string"
    }
  ]
}`,
                },
            ],
            response_format: { type: "json_schema", json_schema: { name: "CarriersResponse", schema: carriersJsonSchema, strict: true } },
            max_tokens: 350,
            temperature: 0.2,
        });

        const raw = completion.choices[0]?.message?.content ?? '{"items":[]}';
        const text = sanitizeJsonString(raw);
        const parsed = JSON.parse(text) as unknown;

        if (!validateCarriers(parsed)) {
            console.error("AI: Ajv errors (json_schema):", validateCarriers.errors);
            throw new Error("ajv_validation_failed_schema");
        }
        const items = (parsed as AICarriersResponse).items;

        const mapped: CarrierOut[] = items.slice(0, 5).map((x) => ({
            ...x,
            verified: false,
            source: "ai",
            confidence: 0.55,
        }));

        if (mapped.length > 0) {
            console.log("AI: json_schema suggestions:", mapped.length);
            return mapped;
        }
        return stub("empty_model_output(json_schema)");
    } catch (err) {
        console.error("AI: json_schema call failed, degrading:", err);
    }

    /* ---------- 3) json_object (with sanitation) ---------- */
    try {
        const completion2 = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: system },
                {
                    role: "user",
                    content:
                        user +
                        ` Return JSON ONLY (no extra keys) exactly as:
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "types": ["truck"|"reefer"|"container"|"flatbed"|"tanker"],
      "lanes": [{"origin":"CC","destination":"CC"}],
      "description": "string",
      "logoEmoji": "string"
    }
  ]
}`,
                },
            ],
            response_format: { type: "json_object" },
            max_tokens: 300,
            temperature: 0.2,
        });

        const raw2 = completion2.choices[0]?.message?.content ?? '{"items":[]}';
        const text2 = sanitizeJsonString(raw2);
        const parsed2 = JSON.parse(text2) as unknown;

        if (!validateCarriers(parsed2)) {
            console.error("AI: Ajv errors (json_object):", validateCarriers.errors);
            return stub("json_object_validation_failed");
        }
        const items2 = (parsed2 as AICarriersResponse).items;

        const mapped2: CarrierOut[] = items2.slice(0, 5).map((x) => ({
            ...x,
            verified: false,
            source: "ai",
            confidence: 0.55,
        }));

        if (mapped2.length > 0) {
            console.log("AI: json_object suggestions:", mapped2.length);
            return mapped2;
        }
        return stub("empty_model_output(json_object)");
    } catch (e2) {
        console.error("AI: json_object call failed:", e2);
        return stub("json_object_call_failed");
    }
}

/* -------------------- Handler -------------------- */
type CarrierQuery = Partial<{
    types: TransportType;
    "lanes.origin": string;
    "lanes.destination": string;
    verified: true;
}>;

export async function POST(req: Request) {
    const t0 = Date.now();
    const { type, origin, destination, verifiedOnly } = await req.json();

    // derive a simple rate-limit key from IP + filters
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        "local";
    const rateKey = `${ip}`;

    // connect DB (cached)
    try {
        await dbConnect();
    } catch (e) {
        console.error("Mongo connect error:", e);
        const suggestions = await aiFallback({ type, origin, destination }, rateKey);
        const t1 = Date.now();
        return NextResponse.json(
            {
                carriers: [],
                suggestions,
                usedAi: true,
                notice: "Database unavailable. Showing unverified AI suggestions.",
            },
            { headers: { "x-duration-ms": String(t1 - t0) } }
        );
    }

    // Build DB query from provided filters only
    const q: CarrierQuery = {};
    if (type) q.types = type as TransportType;
    if (origin) q["lanes.origin"] = origin;
    if (destination) q["lanes.destination"] = destination;
    if (verifiedOnly) q.verified = true;

    try {
        const carriers = await Carrier.find(q).limit(50).lean<CarrierDoc[]>();
        const t1 = Date.now();

        if (carriers.length > 0) {
            const out: CarrierOut[] = carriers.map((c) => ({
                id: c._id.toString(),
                name: c.name,
                types: c.types,
                lanes: c.lanes,
                description: c.description,
                logoEmoji: c.logoEmoji,
                verified: c.verified,
                rating: c.rating,
                contact: c.contact,
                source: "db",
            }));

            return NextResponse.json(
                { carriers: out, usedAi: false },
                { headers: { "x-duration-ms": String(t1 - t0) } }
            );
        }

        const suggestions = await aiFallback({ type, origin, destination }, rateKey);
        const t2 = Date.now();
        return NextResponse.json(
            {
                carriers: [],
                suggestions,
                usedAi: true,
                notice:
                    "No verified carriers found for these filters. Showing unverified AI suggestions.",
            },
            { headers: { "x-duration-ms": String(t2 - t0) } }
        );
    } catch (e) {
        console.error("DB query error:", e);
        const suggestions = await aiFallback({ type, origin, destination }, rateKey);
        const t1 = Date.now();
        return NextResponse.json(
            {
                carriers: [],
                suggestions,
                usedAi: true,
                notice:
                    "We hit an error querying the database. Showing unverified AI suggestions.",
            },
            { headers: { "x-duration-ms": String(t1 - t0) } }
        );
    }
}
