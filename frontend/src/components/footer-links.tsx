"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
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
		<ul className={`flex ${isMobile ? "flex-col items-end my-1" : ""} gap-5`}>
			{links.map(({ href, label }, index) => (
				<li key={index}>
					<AppButton
						aria-label="Go to About Us Page"
						size={isMobile ? "lg" : "md"}
						theme="dark"
						variant="link"
					>
						<Link className={isActive(href) ? "text-link-focus" : ""} href={href}>
							{label}
						</Link>
					</AppButton>
				</li>
			))}
		</ul>
	);
}
