"use client";
import React, { useState } from "react";

interface FormState {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    subject: string;
    message: string;
    consent: boolean;
    // Honeypot (bot trap)
    companyWebsite?: string;
}

export default function ContactForm() {
    const [form, setForm] = useState<FormState>({
        name: "",
        email: "",
        company: "",
        phone: "",
        subject: "General question",
        message: "",
        consent: false,
        companyWebsite: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || "Failed to send. Please try again.");
            }

            setSuccess("Thanks! Your message has been sent.");
            setForm({
                name: "",
                email: "",
                company: "",
                phone: "",
                subject: "General question",
                message: "",
                consent: false,
                companyWebsite: "",
            });
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : typeof err === "string"
                        ? err
                        : "Something went wrong.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4" aria-live="polite">
            {success && (
                <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-2">
                    {success}
                </div>
            )}
            {error && (
                <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-2">
                    {error}
                </div>
            )}

            {/* Honeypot */}
            <div className="hidden">
                <label htmlFor="companyWebsite">Company Website</label>
                <input
                    id="companyWebsite"
                    name="companyWebsite"
                    type="text"
                    autoComplete="off"
                    value={form.companyWebsite}
                    onChange={(e) => update("companyWebsite", e.target.value)}
                />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-700" htmlFor="name">
                        Your name
                    </label>
                    <input
                        id="name"
                        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        required
                        maxLength={80}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-700" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                        maxLength={120}
                    />
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-700" htmlFor="company">
                        Company (optional)
                    </label>
                    <input
                        id="company"
                        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                        value={form.company}
                        onChange={(e) => update("company", e.target.value)}
                        maxLength={120}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-700" htmlFor="phone">
                        Phone (optional)
                    </label>
                    <input
                        id="phone"
                        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        maxLength={40}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700" htmlFor="subject">
                    Subject
                </label>
                <select
                    id="subject"
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    required
                >
                    <option>General question</option>
                    <option>List my company</option>
                    <option>Verification</option>
                    <option>Partnership</option>
                    <option>Other</option>
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700" htmlFor="message">
                    Message
                </label>
                <textarea
                    id="message"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-h-[120px]"
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    required
                    minLength={10}
                    maxLength={2000}
                />
                <div className="text-xs text-gray-500">Include lanes and transport types for faster replies.</div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.consent}
                    onChange={(e) => update("consent", e.target.checked)}
                    required
                />
                I agree to be contacted via email.
            </label>

            <div className="pt-2 flex items-center gap-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-sky-600 text-white shadow disabled:opacity-60"
                >
                    {loading ? "Sending…" : "Send message"}
                </button>
                <button
                    type="reset"
                    onClick={() =>
                        setForm({
                            name: "",
                            email: "",
                            company: "",
                            phone: "",
                            subject: "General question",
                            message: "",
                            consent: false,
                            companyWebsite: "",
                        })
                    }
                    className="px-4 py-2 rounded-xl border"
                >
                    Reset
                </button>
            </div>
        </form>
    );
}
