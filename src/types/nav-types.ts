import type { FC, SVGProps } from "react";

export interface NavItem {
	title: string;
	href?: string;
	disabled?: boolean;
	external?: boolean;
}

export interface NavLink {
	href: string;
	icon: FC<Partial<SVGProps<SVGSVGElement>>>;
	name: string;
}

export interface NavMapping {
	items: NavItem[];
	links: NavLink[];
}
