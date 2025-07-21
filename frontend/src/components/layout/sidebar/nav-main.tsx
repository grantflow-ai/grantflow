"use client";

import { ChevronRight, Clock, LayoutDashboard, Search, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useNavigationStore } from "@/stores/navigation-store";
import { useProjectStore } from "@/stores/project-store";
import { routes } from "@/utils/navigation";

interface NavMainProps {
	"data-testid"?: string;
	userRole?: "ADMIN" | "COLLABORATOR" | "OWNER";
}

export function NavMain({ userRole, ...props }: NavMainProps) {
	const pathname = usePathname();
	const router = useRouter();
	const isProjectsActive = pathname === "/projects";
	const isSettingsActive = pathname.startsWith("/organization/settings");
	const { setOpen, state } = useSidebar();
	const { activeProjectId } = useNavigationStore();
	const project = useProjectStore((state) => state.project);

	const handleExpandSidebar = () => {
		if (state === "collapsed") {
			setOpen(true);
		}
	};

	const handleSettingsClick = (e: React.MouseEvent, href: string) => {
		e.preventDefault();
		// Ensure we have project context before navigating
		if (!(activeProjectId && project)) {
			// If no project context, redirect to projects page
			router.push(routes.organization.root());
			return;
		}
		// Navigate with project context maintained
		router.push(href);
	};

	return (
		<SidebarMenu {...props}>
			{/* Dashboard */}
			<SidebarMenuItem>
				<SidebarMenuButton
					asChild
					className={isProjectsActive ? "bg-white text-primary [&_svg]:text-primary" : ""}
					data-testid="dashboard-button"
					isActive={isProjectsActive}
					tooltip="Dashboard"
				>
					<Link className="flex items-center gap-2" href={routes.organization.root()}>
						<LayoutDashboard className={`size-4 shrink-0 ${isProjectsActive ? "text-primary" : ""}`} />
						<span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>

			<Collapsible className="group/collapsible" defaultOpen>
				<SidebarMenuItem>
					<CollapsibleTrigger asChild>
						<SidebarMenuButton
							className="flex items-center gap-2"
							data-testid="recent-applications-trigger"
							onClick={handleExpandSidebar}
							tooltip="Recent Applications"
						>
							<Clock className="size-4 shrink-0" />
							<span className="group-data-[collapsible=icon]:hidden">Recent Applications</span>
							<ChevronRight className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent className="group-data-[collapsible=icon]:hidden">
						<div className="px-3 pt-4 pb-2">
							<div className="relative">
								<Search className="absolute left-3 top-2.5 h-4 w-4 text-app-gray-400" />
								<Input
									className="pl-9 pr-3 py-2 h-9 bg-white border-app-gray-100 placeholder:text-app-gray-400 placeholder:text-sm"
									data-testid="search-input"
									placeholder="Search application"
								/>
							</div>
						</div>
						<SidebarMenuSub>
							<SidebarMenuSubItem>
								<div className="px-3 py-2 text-sm text-app-gray-600" data-testid="recent-app-item">
									No recent applications
								</div>
							</SidebarMenuSubItem>
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>

			{/* Settings */}
			<Collapsible className="group/collapsible">
				<SidebarMenuItem>
					<CollapsibleTrigger asChild>
						<SidebarMenuButton
							className={`flex items-center gap-2 ${isSettingsActive ? "bg-white text-primary [&_svg]:text-primary" : ""}`}
							data-testid="settings-trigger"
							isActive={isSettingsActive}
							onClick={handleExpandSidebar}
							tooltip="Settings"
						>
							<SettingsIcon className={`size-4 shrink-0 ${isSettingsActive ? "text-primary" : ""}`} />
							<span className="group-data-[collapsible=icon]:hidden">Settings</span>
							<ChevronRight className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent className="group-data-[collapsible=icon]:hidden">
						<SidebarMenuSub>
							<SidebarMenuSubItem>
								<SidebarMenuSubButton
									asChild
									isActive={pathname === routes.organization.settings.account()}
								>
									<Link
										data-testid="organization-settings-account"
										href={routes.organization.settings.account()}
										onClick={(e) => {
											handleSettingsClick(e, routes.organization.settings.account());
										}}
									>
										Account Settings
									</Link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
							{userRole && userRole !== "COLLABORATOR" && (
								<SidebarMenuSubItem>
									<SidebarMenuSubButton
										asChild
										isActive={pathname === routes.organization.settings.billing()}
									>
										<Link
											data-testid="organization-settings-billing"
											href={routes.organization.settings.billing()}
											onClick={(e) => {
												handleSettingsClick(e, routes.organization.settings.billing());
											}}
										>
											Billing & Payments
										</Link>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							)}
							{userRole && userRole !== "COLLABORATOR" && (
								<SidebarMenuSubItem>
									<SidebarMenuSubButton
										asChild
										isActive={pathname === routes.organization.settings.members()}
									>
										<Link
											data-testid="organization-settings-members"
											href={routes.organization.settings.members()}
											onClick={(e) => {
												handleSettingsClick(e, routes.organization.settings.members());
											}}
										>
											Members
										</Link>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							)}
							<SidebarMenuSubItem>
								<SidebarMenuSubButton
									asChild
									isActive={pathname === routes.organization.settings.notifications()}
								>
									<Link
										data-testid="organization-settings-notifications"
										href={routes.organization.settings.notifications()}
										onClick={(e) => {
											handleSettingsClick(e, routes.organization.settings.notifications());
										}}
									>
										Notifications
									</Link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
		</SidebarMenu>
	);
}
