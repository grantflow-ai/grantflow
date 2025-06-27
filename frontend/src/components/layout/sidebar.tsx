"use client";

import { FileText, HelpCircle, LayoutDashboard, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface NavigationItem {
	href: string;
	icon: React.ElementType;
	label: string;
}

const navigationItems: NavigationItem[] = [
	{
		href: "/projects",
		icon: LayoutDashboard,
		label: "Dashboard",
	},
	{
		href: "/applications",
		icon: FileText,
		label: "Applications",
	},
	{
		href: "/settings",
		icon: Settings,
		label: "Settings",
	},
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<div className="flex h-full w-16 flex-col items-center bg-[#faf9fb] border-r border-[#e1dfeb]">
			{/* Logo Section */}
			<div className="flex flex-col items-center gap-2 py-3 px-2">
				<div className="flex size-[31px] items-center justify-center">
					{/* Logo placeholder - replace with actual logo */}
					<div className="bg-[#1e13f8] rounded size-8 flex items-center justify-center">
						<div className="text-white font-bold text-sm">G</div>
					</div>
				</div>
				<button
					className="flex size-4 items-center justify-center text-[#636170]"
					title="Toggle sidebar"
					type="button"
				>
					<div className="text-xs">{">"}</div>
				</button>
			</div>

			{/* Navigation Items */}
			<div className="flex flex-col items-center gap-10 py-6">
				{/* Main Navigation Button - highlighted in blue */}
				<div className="bg-[#1e13f8] rounded size-8 flex items-center justify-center">
					<LayoutDashboard className="size-5 text-white" />
				</div>

				{/* Other Navigation Items */}
				<div className="flex flex-col items-center gap-8">
					{navigationItems.slice(1).map((item) => {
						const isActive = pathname === item.href;
						const Icon = item.icon;

						return (
							<Link
								className={cn(
									"flex size-6 items-center justify-center transition-colors",
									isActive ? "text-[#1e13f8]" : "text-[#636170] hover:text-[#2e2d36]",
								)}
								href={item.href}
								key={item.href}
								title={item.label}
							>
								<Icon className="size-6" />
							</Link>
						);
					})}
				</div>
			</div>

			{/* Bottom Section */}
			<div className="mt-auto mb-6 flex flex-col items-center gap-6">
				<button
					className="flex size-4 items-center justify-center text-[#636170] hover:text-[#2e2d36] transition-colors"
					title="Help"
					type="button"
				>
					<HelpCircle className="size-4" />
				</button>
				<button
					className="flex size-4 items-center justify-center text-[#636170] hover:text-[#2e2d36] transition-colors"
					title="Logout"
					type="button"
				>
					<LogOut className="size-4" />
				</button>
			</div>
		</div>
	);
}
