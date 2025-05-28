"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppButton } from "@/components/app-button";

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

	return (
		<ul className={`flex ${isMobile ? "my-1 flex-col items-end" : ""} gap-3`}>
			{links.map(({ href, label }, index) => (
				<li key={index}>
					<AppButton aria-label="Go to About Us Page" size={isMobile ? "sm" : "sm"} variant="link">
						<Link className={isActive(href) ? "text-link-focus" : ""} href={href}>
							{label}
						</Link>
					</AppButton>
				</li>
			))}
		</ul>
	);
}
