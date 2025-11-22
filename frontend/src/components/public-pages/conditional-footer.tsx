"use client";

import { usePathname } from "next/navigation";
import Footer from "./footer";

export default function ConditionalFooter() {
	const pathname = usePathname();
	const hideFooter = pathname === "/invitation-error";

	if (hideFooter) {
		return null;
	}
	return <Footer />;
}
