/** @jest-environment node */

jest.mock("@/src/lib/db", () => ({
    dbConnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("mongoose", () => {
    const actual = jest.requireActual("mongoose");

    // keep these untyped here; we'll cast them after import
    const mockLean = jest.fn();
    const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
    const mockFind = jest.fn().mockReturnValue({ limit: mockLimit, lean: mockLean });

    return {
        ...actual,
        models: {},
        model: jest.fn(() => ({ find: mockFind })),
        Schema: actual.Schema,
        __mock: { mockFind, mockLimit, mockLean },
    };
});

import * as mongoose from "mongoose";
import { POST } from "./route";

/* ---------- Strong typings for the mock chain ---------- */
type Lane = { origin: string; destination: string };

type CarrierRow = {
    _id: string;
    id?: string;
    name: string;
    verified: boolean;
    types: string[];
    lanes: Lane[];
    description?: string;
    logoEmoji?: string;
};

type LeanFn = jest.Mock<Promise<CarrierRow[]>, []>;
type LimitChain = { lean: LeanFn };
type LimitFn = jest.Mock<LimitChain, [number?]>;
type FindChain = { limit: LimitFn; lean: LeanFn };
type FindFn = jest.Mock<FindChain, [unknown?]>;

type MongooseWithMock = typeof import("mongoose") & {
    __mock: { mockFind: FindFn; mockLimit: LimitFn; mockLean: LeanFn };
};

const { __mock } = mongoose as unknown as MongooseWithMock;
const { mockFind, mockLimit, mockLean } = __mock;

/* ---------- Response typing used by assertions ---------- */
type CarrierOut = {
    id: string;
    name: string;
    types: string[];
    lanes: Lane[];
    description?: string;
    logoEmoji?: string;
    verified: boolean;
    rating?: number;
    contact?: { email?: string; phone?: string; website?: string };
    source: "db" | "ai";
    confidence?: number;
};

type SearchJson =
    | { carriers: CarrierOut[]; usedAi: false }
    | { carriers: []; suggestions: CarrierOut[]; usedAi: true; notice?: string };

describe("POST /api/search", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // type-safe default chain
        mockFind.mockReturnValue({ limit: mockLimit, lean: mockLean } as unknown as FindChain);
        mockLean.mockResolvedValue([] as CarrierRow[]); // <-- fixes “never[]” error

        process.env.AI_FALLBACK_ENABLED = "false";
        delete process.env.OPENAI_API_KEY;
    });

    it("returns DB carriers when found", async () => {
        mockLean.mockResolvedValueOnce([
            {
                _id: "1",
                id: "1",
                name: "Alpine Logistics",
                verified: true,
                types: ["truck"],
                lanes: [{ origin: "FR", destination: "DE" }],
                description: "test",
                logoEmoji: "⛰️",
            },
        ] as CarrierRow[]); // <-- fixes the second error

        const req = new Request("http://test.local/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "truck" }),
        });

        const res = await POST(req);
        const json = (await res.json()) as SearchJson;

        expect(json.usedAi).toBe(false);
        if ("carriers" in json) {
            expect(json.carriers).toHaveLength(1);
            expect(json.carriers[0].name).toBe("Alpine Logistics");
        } else {
            throw new Error("Expected DB carriers");
        }
    });

    it("returns stub suggestions when DB empty", async () => {
        const req = new Request("http://test.local/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "truck", origin: "FR", destination: "DE" }),
        });

        const res = await POST(req);
        const json = (await res.json()) as SearchJson;

        expect(json.usedAi).toBe(true);
        if ("suggestions" in json) {
            expect(json.suggestions.length).toBeGreaterThan(0);
            expect(json.suggestions[0].source).toBe("ai");
        } else {
            throw new Error("Expected AI suggestions");
        }
    });
});
