"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppButton } from "@/components/app/buttons/app-button";

export function FooterLinks({ links }: { links: { href: string; label: string }[] }) {
	const pathname = usePathname();

	const isActive = (href: string) => {
		return pathname === href;
	};

	return (
		<ul className="flex gap-3">
			{links.map(({ href, label }, index) => (
				<li key={index}>
					<AppButton aria-label="Go to About Us Page" className="text-xs md:text-sm" size="sm" variant="link">
						<Link className={isActive(href) ? "text-link-focus" : ""} href={href}>
							{label}
						</Link>
					</AppButton>
				</li>
			))}
		</ul>
	);
}
