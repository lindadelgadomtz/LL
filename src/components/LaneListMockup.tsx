"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

/** Domain types */
type TransportType = "truck" | "reefer" | "container" | "flatbed" | "tanker";

interface Lane {
    origin: string;       // ISO-3166 alpha-2 (e.g., "FR")
    destination: string;  // ISO-3166 alpha-2 (e.g., "ES")
}

interface Contact {
    email?: string;
    phone?: string;
    website?: string;
}

interface Carrier {
    id: string;
    name: string;
    verified?: boolean;
    rating?: number;
    types: TransportType[];
    lanes: Lane[];
    description?: string;
    contact?: Contact;
    logoEmoji?: string;
    source?: "db" | "ai";
    confidence?: number;
}

interface SearchResponse {
    carriers?: Carrier[];
    suggestions?: Carrier[];
    usedAi?: boolean;
    notice?: string;
}

export default function LaneListMockup() {
    // --- Static data (for selectors) ----------------------------------------
    const transportTypes: { id: TransportType; label: string }[] = [
        { id: "truck", label: "Normal Truck" },
        { id: "reefer", label: "Reefer" },
        { id: "container", label: "Container" },
        { id: "flatbed", label: "Flatbed" },
        { id: "tanker", label: "Tanker" },
    ];

    const countries: { code: string; name: string }[] = [
        { code: "FR", name: "France" },
        { code: "ES", name: "Spain" },
        { code: "DE", name: "Germany" },
        { code: "IT", name: "Italy" },
        { code: "NL", name: "Netherlands" },
        { code: "BE", name: "Belgium" },
        { code: "PL", name: "Poland" },
        { code: "GB", name: "United Kingdom" },
        { code: "PT", name: "Portugal" },
    ];

    // --- State --------------------------------------------------------------
    const [selectedType, setSelectedType] = useState<TransportType | "">("");
    const [origin, setOrigin] = useState<string>("");
    const [destination, setDestination] = useState<string>("");
    const [showVerifiedOnly, setShowVerifiedOnly] = useState<boolean>(false);

    const [results, setResults] = useState<Carrier[]>([]); // <-- important: generic
    const [usedAi, setUsedAi] = useState<boolean>(false);
    const [notice, setNotice] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const [contactCarrier, setContactCarrier] = useState<Carrier | null>(null);

    // Simple in-memory cache by filter key
    const cacheRef = useRef<
        Map<string, { results: Carrier[]; usedAi: boolean; notice: string }>
    >(new Map());
    const key = `${selectedType}|${origin}|${destination}|${showVerifiedOnly}`;

    function resetFilters() {
        setSelectedType("");
        setOrigin("");
        setDestination("");
        setShowVerifiedOnly(false);
    }

    // --- Fetch on filter changes (debounced) --------------------------------
    useEffect(() => {
        let aborted = false;
        const controller = new AbortController();

        async function run() {
            setError("");

            // Cache first
            if (cacheRef.current.has(key)) {
                const cached = cacheRef.current.get(key)!;
                setResults(cached.results);
                setUsedAi(cached.usedAi);
                setNotice(cached.notice);
                return;
            }

            setLoading(true);
            try {
                const res = await fetch("/api/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: selectedType || undefined,
                        origin: origin || undefined,
                        destination: destination || undefined,
                        verifiedOnly: showVerifiedOnly || undefined,
                    }),
                    signal: controller.signal,
                });

                const data: SearchResponse = await res.json();
                if (aborted) return;

                const carriers: Carrier[] = Array.isArray(data.carriers) ? data.carriers : [];
                const suggestions: Carrier[] = Array.isArray(data.suggestions) ? data.suggestions : [];

                // Prefer DB results; if none, show AI suggestions (clearly labeled)
                const list = carriers.length > 0 ? carriers : suggestions;
                const usedAiResponse = carriers.length === 0;
                const info = usedAiResponse ? data.notice || "Unverified AI suggestions." : "";

                // Apply verified-only on client too, just in case
                const filtered =
                    showVerifiedOnly && !usedAiResponse ? list.filter((c) => !!c.verified) : list;

                setResults(filtered);
                setUsedAi(usedAiResponse);
                setNotice(info);
                cacheRef.current.set(key, {
                    results: filtered,
                    usedAi: usedAiResponse,
                    notice: info,
                });
            } catch {
                if (!aborted) setError("Could not load results. Please try again.");
            } finally {
                if (!aborted) setLoading(false);
            }
        }

        const t = setTimeout(run, 450); // debounce
        return () => {
            aborted = true;
            controller.abort();
            clearTimeout(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    // --- UI helpers ---------------------------------------------------------
    const findCountryName = (code: string): string =>
        countries.find((c) => c.code === code)?.name || "";

    const findTypeLabel = (id: TransportType): string =>
        transportTypes.find((t) => t.id === id)?.label || "";

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
                    : "text-gray-700 bg-white/70 border-gray-200")
            }
        >
            {children}
        </span>
    );

    const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="rounded-2xl bg-white/70 backdrop-blur shadow-xl border border-gray-200 p-4 md:p-6">
            {children}
        </div>
    );

    // Compose display metrics
    const resultsCount = results.length;

    // --- Render -------------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-gray-200">
                <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 grid place-items-center rounded-xl bg-sky-600 text-white font-bold shadow-sm">
                            LL
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold tracking-tight">LaneList</h1>
                                <span className="text-[10px] uppercase tracking-wider text-white bg-gray-900 rounded px-1.5 py-0.5">
                                    Beta
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 -mt-0.5">Filter. Match. Contact.</p>
                        </div>
                    </div>
                    <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
                        <a className="hover:text-gray-900" href="/how-it-works">
                            How it works
                        </a>
                        <a className="hover:text-gray-900" href="/contact">
                            Carriers
                        </a>
                        <a className="hover:text-gray-900" href="/contact">
                            Add your company
                        </a>
                    </nav>
                    <div className="hidden md:flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg border shadow-sm text-sm">Sign in</button>
                        <button className="px-3 py-1.5 rounded-lg bg-sky-600 text-white shadow-sm text-sm">
                            Sign up
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero + Filters */}
            <section className="mx-auto max-w-7xl px-4 pt-10 pb-8">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-semibold leading-tight">
                            The agenda of global carriers
                        </h2>
                        <p className="mt-3 text-gray-700 max-w-xl">
                            Search by <strong>transport type</strong>, <strong>origin</strong> and{" "}
                            <strong>destination</strong>. Discover verified carriers operating the lanes you
                            need—then contact them directly.
                        </p>
                        <div className="mt-6 flex items-center gap-3 text-sm text-gray-600">
                            <span className="inline-flex items-center gap-1">
                                <span className="text-lg">🌍</span> EU countries
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="text-lg">🚚</span> 5 transport types
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="text-lg">✔️</span> Verified badge available
                            </span>
                        </div>
                    </div>

                    {/* Filters panel */}
                    <Panel>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold">Find carriers</h3>
                            <button onClick={resetFilters} className="text-sm text-sky-700 hover:underline">
                                Reset
                            </button>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3">
                            {/* Type */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-700">Transport type</label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value as TransportType | "")}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                                >
                                    <option value="">Any type</option>
                                    {transportTypes.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Origin */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-700">Origin country</label>
                                <select
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                                >
                                    <option value="">Any origin</option>
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Destination */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-gray-700">Destination country</label>
                                <select
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
                                >
                                    <option value="">Any destination</option>
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={showVerifiedOnly}
                                    onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                                />
                                Show verified carriers only
                            </label>
                            <div className="text-xs text-gray-600 min-h-[20px]">
                                {loading ? (
                                    <span className="inline-flex items-center gap-1">
                                        Loading<span className="animate-pulse">…</span>
                                    </span>
                                ) : (
                                    <>
                                        Showing <strong>{resultsCount}</strong> result
                                        {resultsCount === 1 ? "" : "s"}
                                    </>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                                {error}
                            </div>
                        )}
                        {usedAi && notice && !error && (
                            <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                {notice}
                            </div>
                        )}
                    </Panel>
                </div>
            </section>

            {/* Results */}
            <section id="carriers" className="mx-auto max-w-7xl px-4 pb-16">
                {loading && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 animate-pulse"
                            >
                                <div className="h-4 w-2/3 bg-gray-100 rounded" />
                                <div className="mt-3 h-3 w-1/2 bg-gray-100 rounded" />
                                <div className="mt-4 h-20 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && resultsCount > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {results.map((c: Carrier) => (
                            <div
                                key={c.id}
                                className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 grid place-items-center text-xl rounded-xl bg-gray-100">
                                            {c.logoEmoji || "🚚"}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold leading-tight">{c.name}</h4>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                                                {c.source === "db" && c.verified && <Badge tone="brand">✔️ Verified</Badge>}
                                                {c.source === "ai" && <Badge>🧪 Unverified (AI)</Badge>}
                                                {typeof c.rating === "number" && <Badge>★ {c.rating.toFixed(1)}</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    {c.source !== "ai" && (
                                        <button
                                            onClick={() => setContactCarrier(c)}
                                            className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm shadow"
                                        >
                                            Contact
                                        </button>
                                    )}
                                </div>

                                <p className="mt-3 text-sm text-gray-700 line-clamp-2">{c.description}</p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {c.types?.map((t: TransportType) => (
                                        <Badge key={t}>{findTypeLabel(t) || t}</Badge>
                                    ))}
                                </div>

                                <div className="mt-4">
                                    <div className="text-xs font-medium text-gray-700 mb-1">Lanes</div>
                                    <div className="flex flex-wrap gap-2">
                                        {c.lanes?.map((l: Lane, idx: number) => (
                                            <span
                                                key={`${c.id}-lane-${idx}`}
                                                className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1"
                                            >
                                                {findCountryName(l.origin)} → {findCountryName(l.destination)}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {c.source === "ai" && typeof c.confidence === "number" && (
                                    <div className="mt-4 text-xs text-gray-600">
                                        Confidence: {(c.confidence * 100).toFixed(0)}%
                                    </div>
                                )}

                                <div className="mt-5 pt-4 border-t text-xs text-gray-600">ID: {c.id}</div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && resultsCount === 0 && !error && (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4">🔎</div>
                        <h3 className="text-lg font-semibold">No carriers match your filters</h3>
                        <p className="text-gray-600">Try adjusting your transport type or changing a country.</p>
                        <div className="mt-6 inline-flex items-center gap-3">
                            <Link href="/contact" className="px-4 py-2 rounded-xl bg-sky-600 text-white shadow">
                                List your company
                            </Link>
                            <button onClick={resetFilters} className="px-4 py-2 rounded-xl border">
                                Reset filters
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* How it works */}
            <section id="how" className="bg-gradient-to-b from-white to-sky-50 border-y border-gray-200">
                <div className="mx-auto max-w-7xl px-4 py-14 grid md:grid-cols-3 gap-6">
                    {[
                        { icon: "🧭", title: "Filter", text: "Choose mode, origin & destination." },
                        { icon: "🤝", title: "Match", text: "See carriers that run your lanes." },
                        { icon: "✉️", title: "Contact", text: "Reach out directly to close the deal." },
                    ].map((s, i) => (
                        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="text-3xl">{s.icon}</div>
                            <h4 className="mt-3 font-semibold">{s.title}</h4>
                            <p className="mt-1 text-sm text-gray-700">{s.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA for carriers */}
            <section id="cta" className="mx-auto max-w-7xl px-4 py-14">
                <div className="rounded-3xl bg-gradient-to-r from-sky-600 to-blue-600 text-white p-8 md:p-12 shadow-xl">
                    <div className="grid md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-2">
                            <h3 className="text-2xl md:text-3xl font-semibold">Are you a carrier?</h3>
                            <p className="mt-2 text-white/90 max-w-2xl">
                                Join LaneList to get discovered by traders looking for your exact lanes and modes.
                                Verification available.
                            </p>
                        </div>
                        <div className="flex md:justify-end items-center gap-3">
                            <Link href="/contact">
                                <button className="px-4 py-2 rounded-xl bg-white text-gray-900 font-medium shadow">
                                    List your company
                                </button>
                            </Link>
                            <Link href="/how-it-works">
                                <button className="px-4 py-2 rounded-xl border border-white/60 text-white">
                                    Learn more
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-200">
                <div className="mx-auto max-w-7xl px-4 py-8 grid md:grid-cols-3 gap-6 text-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 grid place-items-center rounded-lg bg-gray-900 text-white text-xs font-bold">
                                LL
                            </div>
                            <span className="font-semibold">LaneList</span>
                        </div>
                        <p className="mt-2 text-gray-600">Filter. Match. Contact.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="font-medium text-gray-900">Product</div>
                            <ul className="mt-2 space-y-1 text-gray-600">
                                <li>
                                    <a className="hover:text-gray-900" href="/how-it-works">
                                        How it works
                                    </a>
                                </li>
                                <li>
                                    <a className="hover:text-gray-900" href="/contact">
                                        Carriers
                                    </a>
                                </li>
                                <li>
                                    <a className="hover:text-gray-900" href="/contact">
                                        Add your company
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <div className="font-medium text-gray-900">Company</div>
                            <ul className="mt-2 space-y-1 text-gray-600">
                                <li>
                                    <a className="hover:text-gray-900" href="/how-it-works">
                                        About
                                    </a>
                                </li>
                                <li>
                                    <a className="hover:text-gray-900" href="/contact">
                                        Contact
                                    </a>
                                </li>
                                <li>
                                    <a className="hover:text-gray-900" href="#">
                                        Privacy
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="text-gray-600 md:text-right">© {new Date().getFullYear()} LaneList</div>
                </div>
            </footer>

            {/* Contact Modal (only for DB results) */}
            {contactCarrier && contactCarrier.source !== "ai" && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setContactCarrier(null)} />
                    <div className="absolute inset-0 grid place-items-center p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 grid place-items-center text-xl rounded-xl bg-gray-100">
                                        {contactCarrier.logoEmoji || "🚚"}
                                    </div>
                                    <div>
                                        <div className="font-semibold">Contact {contactCarrier.name}</div>
                                        {contactCarrier.verified && (
                                            <div className="text-xs text-gray-600">✔️ Verified carrier</div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="text-gray-500 hover:text-gray-800"
                                    onClick={() => setContactCarrier(null)}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                                {contactCarrier.contact?.email && (
                                    <div>
                                        <div className="text-gray-600">Email</div>
                                        <a
                                            className="font-medium text-sky-700 hover:underline"
                                            href={`mailto:${contactCarrier.contact.email}`}
                                        >
                                            {contactCarrier.contact.email}
                                        </a>
                                    </div>
                                )}
                                {contactCarrier.contact?.phone && (
                                    <div>
                                        <div className="text-gray-600">Phone</div>
                                        <a
                                            className="font-medium text-sky-700"
                                            href={`tel:${contactCarrier.contact.phone}`}
                                        >
                                            {contactCarrier.contact.phone}
                                        </a>
                                    </div>
                                )}
                                {contactCarrier.contact?.website && (
                                    <div>
                                        <div className="text-gray-600">Website</div>
                                        <a
                                            className="font-medium text-sky-700 hover:underline"
                                            href={contactCarrier.contact.website}
                                        >
                                            Visit
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button className="px-3 py-1.5 rounded-lg border" onClick={() => setContactCarrier(null)}>
                                    Close
                                </button>
                                <button className="px-4 py-1.5 rounded-lg bg-sky-600 text-white">Send enquiry</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
