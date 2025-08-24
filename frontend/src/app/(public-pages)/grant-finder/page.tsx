import type { Metadata } from "next";
import { GrantFinderClient } from "./grant-finder-client";

export const metadata: Metadata = {
	description:
		"Find the right NIH grant faster and smarter. Get personalized funding opportunities and instant email alerts when matching grants are announced.",
	title: "NIH Grant Finder | GrantFlow",
};

export default function GrantFinderPage() {
	return <GrantFinderClient />;
}
