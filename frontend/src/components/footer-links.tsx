"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function FooterLinks({
	isMobile = false,
	links,
}: {
	isMobile?: boolean;
	links: { href: string; label: string }[];
}) {
	const pathname = usePathname();

	const isActive = (href: string) => {
		return pathname === href;
	};

	const getLinkClasses = (href: string) => {
		const baseClasses = `text-primary ${isMobile ? "text-lg" : ""} hover:text-link-hover hover:no-underline focus:text-link-focus`;
		return isActive(href) ? `${baseClasses} text-link-focus` : baseClasses;
	};

	return (
		<ul className={`text-primary font-button flex gap-5 ${isMobile ? "flex-col items-end my-1" : ""}`}>
			{links.map(({ href, label }, index) => (
				<li key={index}>
					<Link className={getLinkClasses(href)} href={href}>
						{label}
					</Link>
				</li>
			))}
		</ul>
	);
}
