/** @jest-environment node */

import type { NextResponse } from "next/server";

// 1) Mock dbConnect so no real Mongo connection happens
jest.mock("@/src/lib/db", () => ({
    dbConnect: jest.fn().mockResolvedValue(undefined),
}));

// 2) Mock mongoose with functions *created inside* the factory (no TDZ)
jest.mock("mongoose", () => {
    const actual = jest.requireActual("mongoose");

    const mockLean = jest.fn();
    const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
    const mockFind = jest.fn().mockReturnValue({ limit: mockLimit, lean: mockLean });

    return {
        ...actual,
        // ensure no cached model collides with tests
        models: {},
        // when your route calls mongoose.model(...), return an object with .find
        model: jest.fn(() => ({ find: mockFind })),
        Schema: actual.Schema,

        // expose the fns so tests can control return values
        __mock: { mockFind, mockLimit, mockLean },
    };
});

// 3) After mocks are set up, import the mocked module & the route
import * as mongoose from "mongoose";
const { mockFind, mockLimit, mockLean } = (mongoose as any).__mock;

import { POST } from "./route";

describe("POST /api/search", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // default: DB returns empty array
        mockFind.mockReturnValue({ limit: mockLimit, lean: mockLean });
        mockLean.mockResolvedValue([]);

        // keep AI from making network calls in unit tests
        process.env.AI_FALLBACK_ENABLED = "false"; // force stub path if DB empty
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
        ]);

        const req = new Request("http://test.local/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "truck" }),
        });

        const res = (await POST(req as any)) as NextResponse;
        const json = await (res as any).json();

        expect(json.usedAi).toBe(false);
        expect(json.carriers).toHaveLength(1);
        expect(json.carriers[0].name).toBe("Alpine Logistics");
    });

    it("returns stub suggestions when DB empty", async () => {
        // DB empty via default mock
        const req = new Request("http://test.local/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "truck", origin: "FR", destination: "DE" }),
        });

        const res = (await POST(req as any)) as NextResponse;
        const json = await (res as any).json();

        expect(json.usedAi).toBe(true);
        expect(json.suggestions.length).toBeGreaterThan(0);
        expect(json.suggestions[0].source).toBe("ai");
    });
});
