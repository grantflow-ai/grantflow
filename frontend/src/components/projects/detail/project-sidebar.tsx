"use client";

import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	FileText,
	Grid2X2,
	HelpCircle,
	LogOut,
	Plus,
	Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";
import { UserRole } from "@/types/user";

interface CollapsedSidebarProps {
	onExpand?: () => void;
	onLogout: () => void;
	pathname: string;
	projectId: string;
}

interface ProjectSidebarProps {
	applications?: {
		id: string;
		name: string;
		status: "generating" | "in_progress" | "working_draft";
	}[];
	isCollapsed?: boolean;
	onCollapse?: () => void;
	onExpand?: () => void;
	projectId: string;
	userRole?: UserRole;
}

export function ProjectSidebar({
	applications = [],
	isCollapsed = false,
	onCollapse,
	onExpand,
	projectId,
	userRole = UserRole.MEMBER,
}: ProjectSidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const clearUser = useUserStore((state) => state.clearUser);
	const [isRecentAppsOpen, setIsRecentAppsOpen] = useState(true);
	const [isSettingsOpen, setIsSettingsOpen] = useState(pathname.includes("/settings/"));

	const statusColors = {
		generating: "bg-[#1e13f8]",
		in_progress: "bg-[#9747ff]",
		working_draft: "bg-[#211968]",
	};

	const handleLogout = () => {
		clearUser();
		router.push("/login");
	};

	if (isCollapsed) {
		return (
			<CollapsedSidebar onExpand={onExpand} onLogout={handleLogout} pathname={pathname} projectId={projectId} />
		);
	}

	return (
		<div className="flex h-full w-[240px] flex-col bg-[#faf9fb] border-r border-[#e1dfeb]">
			{/* Logo */}
			<div className="flex items-center justify-between px-4 py-4">
				<div className="flex items-center gap-2">
					<div className="size-8 rounded bg-[#1e13f8] flex items-center justify-center">
						<span className="text-white font-bold text-sm">G</span>
					</div>
					<span className="font-['Cabin'] font-medium text-[18px] text-[#2e2d36]">GrantFlow</span>
				</div>
				{onCollapse && (
					<button
						className="p-1 rounded hover:bg-[#e1dfeb] transition-colors"
						onClick={onCollapse}
						type="button"
					>
						<ChevronLeft className="size-4 text-[#636170]" />
					</button>
				)}
			</div>

			{/* New Application Button */}
			<div className="px-4 pb-4">
				<Link
					className="flex items-center justify-center gap-2 w-full rounded bg-[#1e13f8] px-4 py-2 text-white font-['Source_Sans_Pro'] text-[14px] hover:bg-[#1710d4] transition-colors"
					href={`/projects/${projectId}/applications/new`}
				>
					<span className="text-lg">+</span>
					New Application
				</Link>
			</div>

			{/* Navigation */}
			<nav className="flex-1 overflow-y-auto">
				{/* Dashboard Link */}
				<Link
					className={cn(
						"flex items-center gap-3 px-4 py-2 text-[#636170] hover:bg-[#e1dfeb] transition-colors",
						pathname === `/projects/${projectId}` && "bg-[#e1dfeb]",
					)}
					href={`/projects/${projectId}`}
				>
					<Grid2X2 className="size-5" />
					<span className="font-['Source_Sans_Pro'] text-[16px]">Dashboard</span>
				</Link>

				{/* Recent Applications */}
				<div className="mt-4">
					<button
						className="flex w-full items-center justify-between px-4 py-2 text-[#636170] hover:bg-[#e1dfeb] transition-colors"
						onClick={() => {
							setIsRecentAppsOpen(!isRecentAppsOpen);
						}}
						type="button"
					>
						<div className="flex items-center gap-3">
							<FileText className="size-5" />
							<span className="font-['Source_Sans_Pro'] text-[16px]">Recent Applications</span>
						</div>
						{isRecentAppsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
					</button>

					{isRecentAppsOpen && (
						<div className="mt-2 space-y-1">
							{applications.length > 0 ? (
								applications.map((app) => (
									<Link
										className={cn(
											"flex items-center gap-2 px-8 py-2 text-[14px] font-['Source_Sans_Pro'] text-[#636170] hover:bg-[#e1dfeb] transition-colors",
											pathname === `/projects/${projectId}/applications/${app.id}` &&
												"bg-[#e1dfeb]",
										)}
										href={`/projects/${projectId}/applications/${app.id}`}
										key={app.id}
									>
										<div className={cn("size-2 rounded-full", statusColors[app.status])} />
										<span className="truncate">{app.name}</span>
									</Link>
								))
							) : (
								<div className="px-8 py-2 text-[14px] font-['Source_Sans_Pro'] text-[#aaa8b9]">
									No applications yet
								</div>
							)}
						</div>
					)}
				</div>

				{/* Settings */}
				<div className="mt-4">
					<button
						className="flex w-full items-center justify-between px-4 py-2 text-[#636170] hover:bg-[#e1dfeb] transition-colors"
						onClick={() => {
							setIsSettingsOpen(!isSettingsOpen);
						}}
						type="button"
					>
						<div className="flex items-center gap-3">
							<Settings className="size-5" />
							<span className="font-['Source_Sans_Pro'] text-[16px]">Settings</span>
						</div>
						{isSettingsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
					</button>

					{isSettingsOpen && (
						<div className="mt-2 space-y-1">
							<Link
								className={cn(
									"flex items-center gap-3 px-8 py-2 text-[14px] font-['Source_Sans_Pro'] text-[#636170] hover:bg-[#e1dfeb] transition-colors",
									pathname === `/projects/${projectId}/settings/account` && "bg-[#e1dfeb]",
								)}
								href={`/projects/${projectId}/settings/account`}
							>
								Account Setting
							</Link>
							{(userRole === UserRole.OWNER || userRole === UserRole.ADMIN) && (
								<>
									<Link
										className={cn(
											"flex items-center gap-3 px-8 py-2 text-[14px] font-['Source_Sans_Pro'] text-[#636170] hover:bg-[#e1dfeb] transition-colors",
											pathname === `/projects/${projectId}/settings/billing` && "bg-[#e1dfeb]",
										)}
										href={`/projects/${projectId}/settings/billing`}
									>
										Billing and payments
									</Link>
									<Link
										className={cn(
											"flex items-center gap-3 px-8 py-2 text-[14px] font-['Source_Sans_Pro'] text-[#636170] hover:bg-[#e1dfeb] transition-colors",
											pathname === `/projects/${projectId}/settings/members` && "bg-[#e1dfeb]",
										)}
										href={`/projects/${projectId}/settings/members`}
									>
										Members
									</Link>
								</>
							)}
							<Link
								className={cn(
									"flex items-center gap-3 px-8 py-2 text-[14px] font-['Source_Sans_Pro'] text-[#636170] hover:bg-[#e1dfeb] transition-colors",
									pathname === `/projects/${projectId}/settings/notifications` && "bg-[#e1dfeb]",
								)}
								href={`/projects/${projectId}/settings/notifications`}
							>
								Notifications
							</Link>
						</div>
					)}
				</div>
			</nav>

			{/* Bottom Section */}
			<div className="border-t border-[#e1dfeb] p-4 space-y-3">
				<button
					className="flex w-full items-center gap-3 text-[#636170] hover:text-[#2e2d36] transition-colors"
					type="button"
				>
					<HelpCircle className="size-5" />
					<span className="font-['Source_Sans_Pro'] text-[16px]">Support</span>
				</button>
				<button
					className="flex w-full items-center gap-3 text-[#636170] hover:text-[#2e2d36] transition-colors"
					onClick={handleLogout}
					type="button"
				>
					<LogOut className="size-5" />
					<span className="font-['Source_Sans_Pro'] text-[16px]">Logout</span>
				</button>
			</div>
		</div>
	);
}

function CollapsedSidebar({ onExpand, onLogout, pathname, projectId }: CollapsedSidebarProps) {
	return (
		<div className="flex h-full w-16 flex-col bg-[#faf9fb] border-r border-[#e1dfeb]">
			{/* Logo with Expand Button */}
			<div className="flex items-center justify-center px-4 py-4">
				<button
					className="p-1 rounded hover:bg-[#e1dfeb] transition-colors"
					onClick={onExpand}
					title="Expand sidebar"
					type="button"
				>
					<div className="flex items-center gap-2">
						<div className="size-8 rounded bg-[#1e13f8] flex items-center justify-center">
							<span className="text-white font-bold text-sm">G</span>
						</div>
						<ChevronRight className="size-4 text-[#636170]" />
					</div>
				</button>
			</div>

			{/* New Application Button */}
			<div className="px-2 pb-4">
				<Link
					className="flex items-center justify-center w-full rounded bg-[#1e13f8] p-2 text-white hover:bg-[#1710d4] transition-colors"
					href={`/projects/${projectId}/applications/new`}
					title="New Application"
				>
					<Plus className="size-5" />
				</Link>
			</div>

			{/* Navigation Icons */}
			<nav className="flex-1 flex flex-col items-center gap-4">
				{/* Dashboard */}
				<Link
					className={cn(
						"flex items-center justify-center p-2 rounded transition-colors",
						pathname === `/projects/${projectId}`
							? "bg-[#e1dfeb] text-[#1e13f8]"
							: "text-[#636170] hover:bg-[#e1dfeb]",
					)}
					href={`/projects/${projectId}`}
					title="Dashboard"
				>
					<Grid2X2 className="size-6" />
				</Link>

				{/* Recent Applications */}
				<div
					className={cn(
						"flex items-center justify-center p-2 rounded transition-colors",
						"text-[#636170] hover:bg-[#e1dfeb]",
					)}
					title="Recent Applications"
				>
					<FileText className="size-6" />
				</div>

				{/* Settings */}
				<Link
					className={cn(
						"flex items-center justify-center p-2 rounded transition-colors",
						pathname.includes("/settings/")
							? "bg-[#e1dfeb] text-[#1e13f8]"
							: "text-[#636170] hover:bg-[#e1dfeb]",
					)}
					href={`/projects/${projectId}/settings/account`}
					title="Settings"
				>
					<Settings className="size-6" />
				</Link>
			</nav>

			{/* Bottom Section */}
			<div className="border-t border-[#e1dfeb] p-2 flex flex-col items-center gap-3">
				<button
					className="flex items-center justify-center p-2 rounded text-[#636170] hover:text-[#2e2d36] hover:bg-[#e1dfeb] transition-colors"
					title="Support"
					type="button"
				>
					<HelpCircle className="size-6" />
				</button>
				<button
					className="flex items-center justify-center p-2 rounded text-[#636170] hover:text-[#2e2d36] hover:bg-[#e1dfeb] transition-colors"
					onClick={onLogout}
					title="Logout"
					type="button"
				>
					<LogOut className="size-6" />
				</button>
			</div>
		</div>
	);
}
