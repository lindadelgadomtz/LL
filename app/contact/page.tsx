import type { Metadata } from "next";
import ContactForm from "./ContactForm";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Contact LaneList",
    description:
        "Get in touch with LaneList. Questions, partnership, or verification? We’ll reply quickly.",
};

export default function ContactPage() {
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
                        <a className="hover:text-gray-900" href="/how-it-works">About us</a>
                        <a className="hover:text-gray-900" href="/how-it-works#faq">FAQ</a>
                    </nav>
                    <div className="hidden md:flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg border shadow-sm text-sm">Sign in</button>
                        <button className="px-3 py-1.5 rounded-lg bg-sky-600 text-white shadow-sm text-sm">Sign up</button>
                    </div>
                </div>
            </header>
            {/* Hero */}
            <section className="mx-auto max-w-7xl px-4 pt-12 pb-8">
                <div className="grid md:grid-cols-2 gap-6 items-start">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-semibold leading-tight">Contact us</h1>
                        <p className="mt-4 text-gray-700 max-w-xl">
                            Questions about carriers, verification, or partnerships? Send us a message and we’ll get back to you.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shadow-sm text-white bg-sky-600 border-sky-700">
                                ✔️ Fast response
                            </span>
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shadow-sm text-gray-700 bg-white/70 border-gray-200">
                                🌍 EU focus
                            </span>
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shadow-sm text-gray-700 bg-white/70 border-gray-200">
                                🔐 Private &amp; direct
                            </span>
                        </div>
                    </div>

                    {/* Quick info card */}
                    <div className="rounded-2xl bg-white/70 backdrop-blur shadow-xl border border-gray-200 p-5 md:p-6">
                        {/* <div className="text-sm text-gray-700">Prefer email?</div>
                        <div className="mt-2 text-lg font-semibold">
                            {process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@hestia-innovation.com"}
                        </div> */}
                        <p className="mt-2 text-sm text-gray-700">
                            We aim to reply within 1 business day. For carrier listings, include your lanes and transport types.
                        </p>
                        <div className="mt-4 text-xs text-gray-600">
                            *We don’t broker or add fees. LaneList connects shippers and carriers directly.
                        </div>
                    </div>
                </div>
            </section>

            {/* Form */}
            <section className="mx-auto max-w-7xl px-4 pb-14">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 rounded-2xl bg-white/70 backdrop-blur shadow-xl border border-gray-200 p-5 md:p-6">
                        <h2 className="text-lg font-semibold">Send us a message</h2>
                        <p className="mt-1 text-sm text-gray-700">Fill in the form. We’ll email you back.</p>
                        <div className="mt-4">
                            <ContactForm />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white/70 backdrop-blur shadow-xl border border-gray-200 p-5 md:p-6">
                        <h3 className="font-semibold">What to include</h3>
                        <ul className="mt-2 text-sm text-gray-700 space-y-2 list-disc list-inside">
                            <li>Your company name &amp; website</li>
                            <li>Origin/Destination lanes you run</li>
                            <li>Transport types (truck, reefer, etc.)</li>
                            <li>Your goal (list company, verify badge, partnership)</li>
                        </ul>
                        <div className="mt-4 text-xs text-gray-600">We’ll never sell or share your data.</div>
                    </div>
                </div>
            </section>
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
        </div>
    );

}
