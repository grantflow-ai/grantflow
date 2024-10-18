"use client";

import { ElementType } from "react";
import Link from "next/link";
import { BookText, User as UserIcon } from "lucide-react";
import { cn } from "gen/cn";
import { Avatar, AvatarFallback, AvatarImage } from "gen/ui/avatar";
import { Button } from "gen/ui/button";
import { Logo } from "@/components/logo";
import { useSession } from "next-auth/react";

interface NavItemProps {
	icon: ElementType;
	label: string;
	href: string;
	current?: boolean;
}

function NavItem({ icon: Icon, label, href, current }: NavItemProps) {
	return (
		<Link
			href={href}
			aria-current={current ? "page" : undefined}
			className={cn(
				"relative h-10 rounded hover:bg-surface-200",
				"transition-all duration-200",
				"group/item",
				"flex items-center justify-between",
				"w-[90%] group-hover:w-[95%]",
				current
					? "bg-secondary dark:bg-primary/30 shadow-sm text-foreground-secondary"
					: "text-gray-700 dark:text-gray-400",
			)}
			data-testid={`nav-item-${label.toLowerCase().replaceAll(/\s/g, "-")}`}
		>
			<span className="absolute left-0 top-0 flex rounded h-10 w-10 items-center justify-center transition-colors">
				<Icon />
			</span>
			<span className="min-w-[128px] text-sm font-semibold display:none group-hover/item:display-block absolute left-12 transition-all">
				{label}
			</span>
		</Link>
	);
}

function UserButton({ name, email, image }: { name: string | null; email: string | null; image: string | null }) {
	return (
		<Button variant="ghost" className="relative w-full justify-start px-2 mt-3" data-testid="user-menu-button">
			<Avatar className="h-6 w-6 mr-2">
				<AvatarImage src={image ?? undefined} alt={name ?? "anonymous user"} />
				<AvatarFallback>
					<UserIcon size={18} className="text-background" />
				</AvatarFallback>
			</Avatar>
			<span className="w-[8rem] flex flex-col items-start text-sm truncate opacity-0 group-data-[state=expanded]:opacity-100 transition-all">
				{name ? (
					<span title={name} className="w-full text-left text-foreground truncate">
						{name}
					</span>
				) : null}
				{email ? (
					<span title={email} className="w-full text-left text-foreground-light text-xs truncate">
						{email}
					</span>
				) : null}
			</span>
		</Button>
	);
}

export default function Sidebar() {
	const { data: session } = useSession();

	if (!session?.user) {
		return null;
	}

	const { name, email, image } = session.user;

	return (
		<nav
			className={cn(
				"fixed left-0 top-0 bottom-0",
				"w-14 hover:w-48 z-50",
				"border-r border-gray-200 dark:border-gray-700",
				"bg-white dark:bg-secondary",
				"transition-all duration-200",
				"hide-scrollbar flex flex-col justify-between overflow-y-auto overflow-x-hidden",
				"group",
			)}
			aria-label="Main Navigation"
		>
			<div>
				<div className="h-12 border-b">
					<p className="pl-3 pt-2">
						<Logo width={32} height={32} />
					</p>
				</div>
				<div className="flex flex-col pl-2 pt-2 justify-start relative" role="menu">
					<NavItem icon={BookText} label="Home" href="/workspaces" current={true} />
				</div>
			</div>

			<div className="flex flex-col px-2 gap-y-1">
				<UserButton name={name} email={email} image={image} />
			</div>
		</nav>
	);
}
