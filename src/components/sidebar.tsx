"use client";

import { ElementType, useState } from "react";
import Link from "next/link";
import { Home, Search, User as UserIcon } from "lucide-react";
import { cn } from "gen/cn";
import { Avatar, AvatarFallback, AvatarImage } from "gen/ui/avatar";
import { Button } from "gen/ui/button";
import { User } from "@/types/database-types";

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

export default function Sidebar({ user }: { user?: User }) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div
			className="w-14 h-full flex flex-col"
			data-testid="navigation-bar"
			onMouseEnter={() => {
				setIsExpanded(true);
			}}
			onMouseLeave={() => {
				setIsExpanded(false);
			}}
		>
			<nav
				data-state={isExpanded ? "expanded" : "collapsed"}
				className={cn(
					"group py-2 z-10 h-full w-14 border-r border-default shadow-xl transition-all duration-200 hide-scrollbar flex flex-col justify-between overflow-y-auto",
					isExpanded && "w-[13rem]",
				)}
				aria-label="Main Navigation"
			>
				<div>
					<Link href="/" className="mx-2 flex items-center h-[40px]" data-testid="grantflow-logo">
						<img alt="Grantflow Logo" src="/logo.svg" className="h-[40px] w-6 cursor-pointer rounded" />
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

					{user ? <UserButton name={user.name} email={user.email} image={user.image} /> : null}
				</div>
			</nav>
		</div>
	);
}
