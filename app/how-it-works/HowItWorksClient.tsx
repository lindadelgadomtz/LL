"use client";
import React from "react";
import Link from "next/link";

export default function HowItWorks() {
    // --- Reusable bits -------------------------------------------------------
    const Badge: React.FC<{ children: React.ReactNode; tone?: "default" | "brand" | "muted" }> = ({
        children,
        tone = "default",
    }) => (
        <span
            className={
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shadow-sm " +
                (tone === "brand"
                    ? "text-white bg-sky-600 border-sky-700"
                    : tone === "muted"
                        ? "text-gray-600 bg-white/60 border-gray-200"
                        : "text-gray-700 bg-white/70 border-gray-200")
            }
        >
            {children}
        </span>
    );

    const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
        <div className={`rounded-2xl bg-white/70 backdrop-blur shadow-xl border border-gray-200 p-5 md:p-6 ${className || ""}`}>
            {children}
        </div>
    );

    const Step = ({ n, title, desc, icon }: { n: number; title: string; desc: string; icon: string }) => (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="h-10 w-10 grid place-items-center rounded-xl bg-gray-100 text-xl" aria-hidden>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Badge tone="muted">Step {n}</Badge>
                        <h4 className="font-semibold leading-tight">{title}</h4>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{desc}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-gray-900">
            {/* Local header (optional). If you already have a global header, remove this block. */}
            <header className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-gray-200">
                <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 grid place-items-center rounded-xl bg-sky-600 text-white font-bold shadow-sm">LL</div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold tracking-tight">LaneList</h1>
                                <span className="text-[10px] uppercase tracking-wider text-white bg-gray-900 rounded px-1.5 py-0.5">Beta</span>
                            </div>
                            <p className="text-xs text-gray-600 -mt-0.5">Filter. Match. Contact.</p>
                        </div>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
                        {/* FIX: use Link for internal route "/" */}
                        <Link className="hover:text-gray-900" href="/">Search</Link>
                        <a className="hover:text-gray-900" href="#faq">FAQ</a>
                        <a className="hover:text-gray-900" href="#cta">For carriers</a>
                    </nav>
                    <div className="hidden md:flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg border shadow-sm text-sm">Sign in</button>
                        <button className="px-3 py-1.5 rounded-lg bg-sky-600 text-white shadow-sm text-sm">Sign up</button>
                    </div>
                </div>
            </header>

            {/* Hero ----------------------------------------------------------------*/}
            <section className="mx-auto max-w-7xl px-4 pt-12 pb-10">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-semibold leading-tight">How LaneList works</h2>
                        <p className="mt-4 text-gray-700 max-w-xl">
                            From <strong>filter</strong> to <strong>first contact</strong> in minutes. LaneList helps shippers and
                            traders quickly find <em>verified</em> carriers operating the exact lanes you need.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                            <Badge tone="brand">✔️ Verification available</Badge>
                            <Badge>🚚 Road · Reefer · Container · Flatbed · Tanker</Badge>
                            <Badge>🌍 EU focus</Badge>
                        </div>
                    </div>

                    {/* Mini demo card */}
                    <Panel>
                        <div className="text-sm text-gray-700">What a typical search looks like</div>
                        <div className="mt-3 grid sm:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-700">Transport type</label>
                                <div className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm grid place-items-start">
                                    Normal Truck
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-700">Origin</label>
                                <div className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm grid place-items-start">
                                    France
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-700">Destination</label>
                                <div className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm grid place-items-start">
                                    Spain
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" className="h-4 w-4" defaultChecked />
                                Show verified carriers only
                            </label>
                            <div className="text-xs text-gray-600">Showing <strong>18</strong> results</div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-gray-200 p-3 bg-white">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 grid place-items-center rounded-lg bg-gray-100">🚚</div>
                                    <div className="text-sm font-medium">Iberia Freight</div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge tone="brand">✔️ Verified</Badge>
                                    <Badge>Normal Truck</Badge>
                                </div>
                                <div className="mt-2 text-xs text-gray-700">France → Spain · Spain → France</div>
                            </div>
                            <div className="rounded-xl border border-gray-200 p-3 bg-white">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 grid place-items-center rounded-lg bg-gray-100">🚛</div>
                                    <div className="text-sm font-medium">EuroTrans</div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge>Reefer</Badge>
                                    <Badge>France → Spain</Badge>
                                </div>
                                <div className="mt-2 text-xs text-gray-700">Direct contact · No broker fees</div>
                            </div>
                        </div>
                    </Panel>
                </div>
            </section>

            {/* Steps --------------------------------------------------------------- */}
            <section className="bg-gradient-to-b from-white to-sky-50 border-y border-gray-200">
                <div className="mx-auto max-w-7xl px-4 py-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Step n={1} icon="🧭" title="Filter" desc="Select transport type, origin and destination. Optional: toggle verified-only to focus on audited carriers." />
                    <Step n={2} icon="🤖" title="Match" desc="We first show database results. If none are found, we generate clearly-labeled AI suggestions to widen your options." />
                    <Step n={3} icon="🔎" title="Compare" desc="Open a carrier card to review lanes, modes, badge, rating and a short description of the company." />
                    <Step n={4} icon="✉️" title="Contact" desc="Reach out directly via email, phone or website. Negotiate, book and track off-platform as you prefer." />
                </div>
            </section>

            {/* Trust & Transparency ----------------------------------------------- */}
            <section className="mx-auto max-w-7xl px-4 py-12 grid md:grid-cols-3 gap-6">
                <Panel>
                    <div className="text-2xl">✔️</div>
                    <h3 className="mt-2 text-lg font-semibold">What “Verified” means</h3>
                    <p className="mt-2 text-sm text-gray-700">
                        Verified carriers have been checked by LaneList using public records, and direct validation.
                        They display a <Badge tone="brand">✔️ Verified</Badge> badge and show up when &ldquo;verified only&rdquo; is enabled.
                    </p>
                </Panel>
                <Panel>
                    <div className="text-2xl">🧪</div>
                    <h3 className="mt-2 text-lg font-semibold">AI suggestions, clearly labeled</h3>
                    <p className="mt-2 text-sm text-gray-700">
                        When the database has no exact match, we show <Badge>Unverified (AI)</Badge> options. These are suggestions to
                        help you discover potential carriers. Always validate before contracting.
                    </p>
                </Panel>
                <Panel>
                    <div className="text-2xl">🔐</div>
                    <h3 className="mt-2 text-lg font-semibold">Privacy & control</h3>
                    <p className="mt-2 text-sm text-gray-700">
                        LaneList is a search tool, not a broker. We don&rsquo;t add fees and we don&rsquo;t sit between you and providers. Contact
                        is direct; your negotiations remain private.
                    </p>
                </Panel>
            </section>

            {/* FAQs ----------------------------------------------------------------*/}
            <section id="faq" className="mx-auto max-w-7xl px-4 pb-4 pt-2">
                <h3 className="text-xl font-semibold">Frequently asked questions</h3>
                <div className="mt-6 grid md:grid-cols-2 gap-5">
                    <Panel>
                        <div className="font-medium">Is LaneList free?</div>
                        <p className="mt-1 text-sm text-gray-700">Searching is free. Carriers can opt for verification or boosted visibility.</p>
                    </Panel>
                    <Panel>
                        <div className="font-medium">Which regions are covered?</div>
                        <p className="mt-1 text-sm text-gray-700">We focus on EU lanes first, then expand progressively based on demand.</p>
                    </Panel>
                    <Panel>
                        <div className="font-medium">What data is shown on a carrier card?</div>
                        <p className="mt-1 text-sm text-gray-700">Company name, modes, lanes, verification badge, rating (if any), short description and contact methods.</p>
                    </Panel>
                    <Panel>
                        <div className="font-medium">How do you verify carriers?</div>
                        <p className="mt-1 text-sm text-gray-700">Verified carriers have been checked by LaneList using public records, and direct validation.</p>
                    </Panel>
                    <Panel>
                        <div className="font-medium">Are AI results safe to use?</div>
                        <p className="mt-1 text-sm text-gray-700">Treat them as leads. They are clearly labeled and include a confidence hint when available. Always validate.</p>
                    </Panel>
                    <Panel>
                        <div className="font-medium">Can I list my company?</div>
                        <p className="mt-1 text-sm text-gray-700">Yes—see the section below to submit your company and start receiving inquiries.</p>
                    </Panel>
                </div>
            </section>

            {/* CTA for carriers ----------------------------------------------------*/}
            <section id="cta" className="mx-auto max-w-7xl px-4 py-14">
                <div className="rounded-3xl bg-gradient-to-r from-sky-600 to-blue-600 text-white p-8 md:p-12 shadow-xl">
                    <div className="grid md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-2">
                            <h3 className="text-2xl md:text-3xl font-semibold">Are you a carrier?</h3>
                            <p className="mt-2 text-white/90 max-w-2xl">
                                List your lanes and modes so traders can find you. Apply for verification to stand out and build trust.
                            </p>
                        </div>
                        <div className="flex md:justify-end items-center gap-3">
                            <Link href="/contact">
                                <button className="px-4 py-2 rounded-xl bg-white text-gray-900 font-medium shadow">List your company</button>
                            </Link>
                            <Link href="/" className="px-4 py-2 rounded-xl border border-white/60 text-white">Back to search</Link>
                        </div>
                    </div>
                </div>
            </section >

            {/* Footer (light) ------------------------------------------------------*/}
            < footer className="border-t border-gray-200" >
                <div className="mx-auto max-w-7xl px-4 py-8 grid md:grid-cols-3 gap-6 text-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 grid place-items-center rounded-lg bg-gray-900 text-white text-xs font-bold">LL</div>
                            <span className="font-semibold">LaneList</span>
                        </div>
                        <p className="mt-2 text-gray-600">Filter. Match. Contact.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="font-medium text-gray-900">Product</div>
                            <ul className="mt-2 space-y-1 text-gray-600">
                                <li>
                                    {/* FIX: use Link for internal route "/" */}
                                    <Link className="hover:text-gray-900" href="/">Search</Link>
                                </li>
                                <li>
                                    <Link className="hover:text-gray-900" href="/how-it-works#faq">FAQ</Link>
                                </li>
                                <li>
                                    <Link className="hover:text-gray-900" href="/contact">Add your company</Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">Company</div>
                            <ul className="mt-2 space-y-1 text-gray-600">
                                <li>
                                    <Link className="hover:text-gray-900" href="/how-it-works">About</Link>
                                </li>
                                <li>
                                    <Link className="hover:text-gray-900" href="/contact">Contact</Link>
                                </li>
                                <li>
                                    <a className="hover:text-gray-900" href="#">Privacy</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="text-gray-600 md:text-right">© {new Date().getFullYear()} LaneList</div>
                </div>
            </footer >
        </div >
    );
}
