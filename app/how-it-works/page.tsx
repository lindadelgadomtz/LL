// app/how-it-works/page.tsx  (server file)
import type { Metadata } from "next";
import HowItWorksClient from "./HowItWorksClient"; // client component

export const metadata: Metadata = {
    title: "How LaneList Works",
    description: "From filter to first contact in minutes...",
};

export default function HowItWorksPage() {
    return <HowItWorksClient />;
}
