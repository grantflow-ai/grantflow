"use client";

import { ElementType } from "react";
import Link from "next/link";
import { Home, Search, User as UserIcon } from "lucide-react";
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
				"relative h-10 w-full transition-all duration-200 flex items-center rounded hover:bg-surface-200 group/item",
				current && "bg-selection shadow-sm",
			)}
			data-testid={`nav-item-${label.toLowerCase().replaceAll(/\s/g, "-")}`}
		>
			<span className="absolute left-0 top-0 flex rounded h-10 w-10 items-center justify-center text-foreground-lighter group-hover/item:text-foreground-light transition-colors">
				<Icon size={20} />
			</span>
			<span className="min-w-[128px] text-sm text-foreground-light group-hover/item:text-foreground absolute left-12 opacity-0 group-data-[state=expanded]:opacity-100 transition-all">
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
				"bg-brand z-10 group z-10 border-r border-default shadow-xl transition-all duration-200 hide-scrollbar flex flex-col justify-between overflow-y-auto w-10 hover:w-32 fixed left-0 top-0 bottom-0",
			)}
			aria-label="Main Navigation"
		>
			<div>
				<Link href="/" className="mx-2 flex items-center h-[40px]" data-testid="grantflow-logo">
					<Logo />
				</Link>
				<ul className="flex flex-col gap-y-1 justify-start px-2 relative" role="menu">
					<li role="none">
						<NavItem icon={Home} label="Home" href="/" current={true} />
					</li>
				</ul>
			</div>

			<div className="flex flex-col px-2 gap-y-1">
				<Button
					variant="ghost"
					size="icon"
					className="relative w-full h-10"
					aria-label="Search"
					data-testid="search-button"
				>
					<Search size={20} className="absolute left-2 text-foreground-lighter" />
					<span className="absolute left-10 opacity-0 group-data-[state=expanded]:opacity-100 w-[10rem] text-sm flex flex-col items-center transition-all">
						<span className="w-full text-left text-foreground-light truncate">Search</span>
					</span>
				</Button>
				<UserButton name={name} email={email} image={image} />
			</div>
		</nav>
	);
}
