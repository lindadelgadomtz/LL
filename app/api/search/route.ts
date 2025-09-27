// app/api/search/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import mongoose from "mongoose";
import Ajv from "ajv";

function sanitizeJsonString(s: string) {
    if (!s) return s;
    // remove markdown fences if present
    s = s.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    // try to cut at the last complete bracket/brace to avoid trailing partials
    const lastBrace = s.lastIndexOf("}");
    const lastBracket = s.lastIndexOf("]");
    const cut = Math.max(lastBrace, lastBracket);
    if (cut > 0) s = s.slice(0, cut + 1);
    return s;
}

export const runtime = "nodejs";

// ---- ENV
const {
    MONGODB_URI,
    OPENAI_API_KEY,
    OPENAI_MODEL = "gpt-4.1-mini",
    AI_FALLBACK_ENABLED = "true",
} = process.env;

// ---- MONGOOSE MODEL
const LaneSchema = new mongoose.Schema({ origin: String, destination: String }, { _id: false });
const CarrierSchema = new mongoose.Schema(
    {
        name: String,
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
const Carrier = mongoose.models.Carrier || mongoose.model("Carrier", CarrierSchema);

async function connect() {
    if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
}

// ---- AI: strict schema + validator
const carriersSchema = {
    name: "CarriersResponse",
    schema: {
        type: "object",
        additionalProperties: false,
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
                                    origin: { type: "string" }, // ISO-3166 alpha-2 preferred
                                    destination: { type: "string" },
                                },
                            },
                        },
                        description: { type: "string" },
                        logoEmoji: { type: "string" },
                    },
                },
            },
        },
        required: ["items"],
    },
    strict: true,
} as const;

const ajv = new Ajv({ removeAdditional: "all", allErrors: true });
const validateCarriers = ajv.compile(carriersSchema.schema as any);

// ---- Stub suggestion (local, no API)
function stubSuggestion({
    type,
    origin,
    destination,
}: {
    type?: string;
    origin?: string;
    destination?: string;
}) {
    return [
        {
            id: `ai-stub-${Date.now()}`,
            name: "Regional Carrier Suggestion",
            verified: false,
            types: type ? [type] : ["truck"],
            lanes: [{ origin: origin || "FR", destination: destination || "ES" }],
            description: "Unverified suggestion based on similar lanes in the region.",
            logoEmoji: "🧭",
            source: "ai" as const,
            confidence: 0.55,
        },
    ];
}

// ---- Simple in-memory rate limit for AI calls
const aiWindowMs = 60_000; // per minute
const aiMaxCalls = 20;     // per IP per minute
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

// ---- AI Fallback with guardrails
const MIN_FILTERS_FOR_AI = 2;

async function aiFallback(
    params: { type?: string; origin?: string; destination?: string },
    rateKey: string
) {
    const { type, origin, destination } = params;

    const stub = (reason: string) => {
        console.warn("AI: returning stub —", reason, { type, origin, destination });
        return stubSuggestion(params);
    };

    // Toggle
    if ((process.env.AI_FALLBACK_ENABLED || "true") !== "true") return stub("ai_disabled");

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

    // ---------- 1) PREFERRED: function calling (tools) ----------
    try {
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL || "gpt-4o-mini",
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
                        // Use the same JSON Schema you defined (carriersSchema.schema)
                        parameters: carriersSchema.schema as any,
                    },
                },
            ],
            tool_choice: { type: "function", function: { name: "return_carriers" } },
            temperature: 0.2,
            max_tokens: 450,
        });

        const toolCalls = completion.choices?.[0]?.message?.tool_calls ?? [];
        const fnCall = toolCalls.find(tc => tc.type === "function");

        if (!fnCall || fnCall.type !== "function") {
            throw new Error("no_function_tool_call");
        }

        const argText = fnCall.function.arguments;
        if (!argText) {
            throw new Error("no_tool_call_arguments");
        }

        let parsed: any;
        try {
            parsed = JSON.parse(argText);
        } catch {
            console.error("AI: tool args parse error, raw:", argText);
            throw new Error("tool_args_parse_error");
        }

        const ok = validateCarriers(parsed); // Ajv strips extras
        if (!ok) {
            console.error("AI: Ajv errors (tools):", validateCarriers.errors);
            throw new Error("ajv_validation_failed_tools");
        }

        const items: any[] = Array.isArray(parsed.items) ? parsed.items : [];
        const mapped =
            items.slice(0, 5).map((x: any) => ({
                ...x,
                verified: false,
                source: "ai" as const,
                confidence: 0.55,
            })) ?? [];

        if (mapped.length > 0) {
            console.log("AI: tools suggestions:", mapped.length);
            return mapped;
        }
        return stub("empty_model_output(tools)");
    } catch (err) {
        console.error("AI: tools call failed, degrading:", err);
    }

    // ---------- 2) STRICT: json_schema ----------
    try {
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL || "gpt-4o-mini",
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
            response_format: { type: "json_schema", json_schema: carriersSchema },
            max_tokens: 350,
            temperature: 0.2,
        });

        const raw = completion.choices[0]?.message?.content ?? '{"items":[]}';
        // If you kept the helper, sanitize before parsing:
        // const text = sanitizeJsonString(raw);
        const text = raw;

        let parsed: any;
        try {
            parsed = JSON.parse(text);
        } catch {
            console.error("AI: json_schema parse error, raw:", raw);
            throw new Error("json_schema_parse_error");
        }

        const ok = validateCarriers(parsed);
        if (!ok) {
            console.error("AI: Ajv errors (json_schema):", validateCarriers.errors);
            throw new Error("ajv_validation_failed_schema");
        }

        const items: any[] = Array.isArray(parsed.items) ? parsed.items : [];
        const mapped =
            items.slice(0, 5).map((x: any) => ({
                ...x,
                verified: false,
                source: "ai" as const,
                confidence: 0.55,
            })) ?? [];

        if (mapped.length > 0) {
            console.log("AI: json_schema suggestions:", mapped.length);
            return mapped;
        }
        return stub("empty_model_output(json_schema)");
    } catch (err) {
        console.error("AI: json_schema call failed, degrading:", err);
    }

    // ---------- 3) SIMPLE: json_object (with sanitation) ----------
    try {
        const completion2 = await openai.chat.completions.create({
            model: OPENAI_MODEL || "gpt-4o-mini",
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
        // Optional sanitize if you kept helper:
        // const text2 = sanitizeJsonString(raw2);
        const text2 = raw2;

        let parsed2: any;
        try {
            parsed2 = JSON.parse(text2);
        } catch {
            console.error("AI: json_object parse error, raw:", raw2);
            return stub("json_object_parse_error");
        }

        const ok2 = validateCarriers(parsed2);
        const items2: any[] = ok2 && Array.isArray(parsed2.items) ? parsed2.items : [];
        const mapped2 =
            items2.slice(0, 5).map((x: any) => ({
                ...x,
                verified: false,
                source: "ai" as const,
                confidence: 0.55,
            })) ?? [];

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




// ---- Handler
export async function POST(req: Request) {
    const t0 = Date.now();
    const { type, origin, destination, verifiedOnly } = await req.json();

    // derive a simple rate-limit key from IP + filters
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        "local";
    const rateKey = `${ip}`;

    try {
        await connect();
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
    const q: any = {};
    if (type) q.types = type;
    if (origin) q["lanes.origin"] = origin;
    if (destination) q["lanes.destination"] = destination;
    if (verifiedOnly) q.verified = true;

    try {
        const carriers = await Carrier.find(q).limit(50).lean();
        const t1 = Date.now();

        if (carriers.length > 0) {
            return NextResponse.json(
                {
                    carriers: carriers.map((c: any) => ({ ...c, source: "db" as const })),
                    usedAi: false,
                },
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
                notice: "We hit an error querying the database. Showing unverified AI suggestions.",
            },
            { headers: { "x-duration-ms": String(t1 - t0) } }
        );
    }
}
