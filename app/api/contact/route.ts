import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // nodemailer requires Node.js runtime

function isValidEmail(email: string) {
    return /.+@.+\..+/.test(email);
}

function sanitize(input: string) {
    return input.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim();
}

// Simple in-memory rate limit (per server instance / cold start)
type RateEntry = { count: number; ts: number };
type RateMap = Map<string, RateEntry>;

declare global {
    // eslint-disable-next-line no-var
    var __CONTACT_RATE__: RateMap | undefined;
}

const attempts: RateMap =
    globalThis.__CONTACT_RATE__ ?? new Map<string, RateEntry>();
globalThis.__CONTACT_RATE__ = attempts;

function rateLimit(key: string, limit = 5, windowMs = 60 * 60 * 1000) {
    const now = Date.now();
    const item = attempts.get(key);
    if (!item || now - item.ts > windowMs) {
        attempts.set(key, { count: 1, ts: now });
        return true;
    }
    if (item.count >= limit) return false;
    item.count++;
    return true;
}

export async function POST(req: Request) {
    try {
        const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "unknown";
        if (!rateLimit(ip)) {
            return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
        }

        const body = await req.json();
        const {
            name = "",
            email = "",
            company = "",
            phone = "",
            subject = "General question",
            message = "",
            consent = false,
            companyWebsite = "", // honeypot
        } = body || {};

        // Honeypot check
        if (companyWebsite) {
            return NextResponse.json({ ok: true }, { status: 200 }); // silently accept
        }

        // Basic validation
        const v = {
            name: sanitize(String(name)).slice(0, 80),
            email: sanitize(String(email)).slice(0, 120),
            company: sanitize(String(company || "")).slice(0, 120),
            phone: sanitize(String(phone || "")).slice(0, 40),
            subject: sanitize(String(subject)).slice(0, 60),
            message: sanitize(String(message)).slice(0, 2000),
            consent: Boolean(consent),
        };

        if (!v.name || !isValidEmail(v.email) || !v.message || !v.consent) {
            return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
        }

        // Environment
        const host = process.env.ZOHO_HOST || "smtp.zoho.eu";
        const port = Number(process.env.ZOHO_PORT || 465);
        const user = process.env.ZOHO_USER;
        const pass = process.env.ZOHO_PASS;
        const to = process.env.CONTACT_TO || user;

        if (!user || !pass || !to) {
            return NextResponse.json({ error: "Email not configured on server." }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for 587
            auth: { user, pass },
        });

        const html = `
      <div style="font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif">
        <h2>New contact from LaneList</h2>
        <p><strong>Name:</strong> ${v.name}</p>
        <p><strong>Email:</strong> ${v.email}</p>
        ${v.company ? `<p><strong>Company:</strong> ${v.company}</p>` : ""}
        ${v.phone ? `<p><strong>Phone:</strong> ${v.phone}</p>` : ""}
        <p><strong>Subject:</strong> ${v.subject}</p>
        <p><strong>Message:</strong></p>
        <div style="white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fafafa">${v.message}</div>
        <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="color:#6b7280;font-size:12px">IP: ${ip}</p>
      </div>
    `;

        await transporter.sendMail({
            from: `LaneList Contact <${user}>`,
            to,
            replyTo: v.email,
            subject: `[LaneList] ${v.subject} — ${v.name}`,
            text: `Name: ${v.name}
Email: ${v.email}
Company: ${v.company}
Phone: ${v.phone}
Subject: ${v.subject}

Message:
${v.message}`,
            html,
        });

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err) {
        console.error("/api/contact error", err);
        return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
    }
}
