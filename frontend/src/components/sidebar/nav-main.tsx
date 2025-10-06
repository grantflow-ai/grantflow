"use client";

import { ChevronRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listOrganizationApplications } from "@/actions/grant-applications";
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
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import type { API } from "@/types/api-types";
import { routes } from "@/utils/navigation";
import { DashboardIcon } from "../icons/dashboard-icon";
import { NoteStackIcon } from "../icons/note-stack-icon";
import { SettingsIcon } from "../icons/settings-icon";

type ApplicationStatus = API.ListApplications.Http200.ResponseBody["applications"][0]["status"];

interface SidebarStatusStyle {
	bg: string;
	icon: string;
	label: string;
	text: string;
}

const SidebarStatusStyleMap: Record<ApplicationStatus, SidebarStatusStyle> = {
	CANCELLED: {
		bg: "bg-red-500",
		icon: "/icons/close.svg",
		label: "Cancelled",
		text: "text-white",
	},
	GENERATING: {
		bg: "bg-primary",
		icon: "/icons/piechart.svg",
		label: "Generating",
		text: "text-white",
	},
	IN_PROGRESS: {
		bg: "bg-app-gray-300",
		icon: "/icons/draft-in-progress.svg",
		label: "In Progress",
		text: "text-app-dark-blue",
	},
	WORKING_DRAFT: {
		bg: "bg-app-dark-blue",
		icon: "/icons/working-draft-white.svg",
		label: "Working Draft",
		text: "text-white",
	},
};

interface NavMainProps {
	"data-testid"?: string;
	userRole?: "ADMIN" | "COLLABORATOR" | "OWNER";
}

export function NavMain({ userRole, ...props }: NavMainProps) {
	const pathname = usePathname();
	const router = useRouter();
	const isSettingsActive = pathname.startsWith("/organization/settings");
	const { setOpen, state } = useSidebar();
	const { selectedOrganizationId } = useOrganizationStore();
	const [activeCollapsible, setActiveCollapsible] = useState<null | string>(isSettingsActive ? "settings" : null);
	const isDashboardActive = pathname === routes.organization.root();
	const [recentApplications, setRecentApplications] = useState<
		API.ListOrganizationApplications.Http200.ResponseBody["applications"]
	>([]);
	const { navigateToApplication } = useNavigationStore();
	const { projects } = useProjectStore();

	const handleExpandSidebar = () => {
		if (state === "collapsed") {
			setOpen(true);
		}
	};

	const handleSettingsClick = (e: React.MouseEvent, href: string) => {
		e.preventDefault();

		router.push(href);
	};

	const handleOpenApplication = (application: (typeof recentApplications)[0]) => {
		const project = projects.find((p) => p.id === application.project_id);
		if (!project) {
			toast.error("Project not found for this application.");
			return;
		}
		navigateToApplication(project.id, project.name, application.id, application.title);
		router.push(routes.organization.project.application.wizard());
	};

	useEffect(() => {
		if (selectedOrganizationId) {
			const fetchApplications = async () => {
				try {
					const response = await listOrganizationApplications(selectedOrganizationId);
					setRecentApplications(response.applications);
				} catch {
					toast.error("Failed to fetch recent applications.");
				}
			};
			void fetchApplications();
		}
	}, [selectedOrganizationId]);

	return (
		<SidebarMenu {...props} className="flex flex-col gap-8 group-data-[collapsible=icon]:gap-6">
			<SidebarMenuItem className="">
				<SidebarMenuButton asChild className="text-primary" data-testid="dashboard-button" tooltip="Dashboard">
					<Link className="flex items-center gap-2" href={routes.organization.root()}>
						<DashboardIcon
							className={`size-4 shrink-0 group-data-[collapsible=icon]:hidden ${isDashboardActive ? "text-primary" : "text-app-gray-700"}`}
						/>
						<DashboardIcon
							className={`size-4 shrink-0 hidden group-data-[collapsible=icon]:block ${isDashboardActive ? "text-primary" : "text-app-black"}`}
						/>
						<span
							className={`group-data-[collapsible=icon]:hidden text-sm font-normal leading-5  ${isDashboardActive ? "text-primary" : "text-app-black"}`}
						>
							Dashboard
						</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>

			<Collapsible
				className="group/collapsible"
				onOpenChange={(isOpen) => {
					setActiveCollapsible(isOpen ? "applications" : null);
				}}
				open={activeCollapsible === "applications"}
			>
				<SidebarMenuItem className="flex flex-col gap-4">
					<CollapsibleTrigger asChild>
						<SidebarMenuButton
							className="flex items-center gap-2 hover:!bg-transparent"
							data-testid="recent-applications-trigger"
							onClick={handleExpandSidebar}
							tooltip="Recent Applications"
						>
							<NoteStackIcon className="size-4 shrink-0 group-data-[collapsible=icon]:hidden group-data-[state=closed]/collapsible:hidden text-primary" />
							<NoteStackIcon className="size-4 shrink-0 hidden group-data-[collapsible=icon]:block group-data-[state=closed]/collapsible:block text-app-gray-700" />
							<span className="group-data-[collapsible=icon]:hidden text-sm font-normal text-primary group-data-[state=closed]/collapsible:text-app-black">
								Recent Applications
							</span>
							<ChevronRight className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent className="group-data-[collapsible=icon]:hidden">
						{recentApplications.length >= 6 && (
							<div className="px-3 pt-4 pb-2">
								<div className="relative">
									<Search className="absolute right-3 top-2.5 h-4 w-4 text-app-black" />
									<Input
										className="pl-3 pr-3 py-2 h-10 bg-white rounded border-app-gray-100 placeholder:text-app-gray-400 placeholder:text-sm placeholder:font-normal"
										data-testid="search-input"
										placeholder="Search application"
									/>
								</div>
							</div>
						)}
						<SidebarMenuSub className="flex flex-col gap-4 border-l-0 p-0  ">
							{recentApplications.length > 0 ? (
								recentApplications.map((application) => {
									const statusStyles = SidebarStatusStyleMap[application.status];
									return (
										<SidebarMenuSubItem className="" key={application.id}>
											<SidebarMenuSubButton
												asChild
												className="h-auto "
												isActive={pathname.includes(
													routes.organization.project.application.wizard(),
												)}
											>
												<button
													className="flex flex-col items-start "
													data-testid={`recent-application-${application.id}`}
													onClick={() => {
														handleOpenApplication(application);
													}}
												>
													<div
														className={`w-fit px-1 py-0.5 flex items-center gap-0.5 rounded-full ${statusStyles.bg}`}
													>
														<Image
															alt={`${statusStyles.label} icon`}
															height={7}
															src={statusStyles.icon}
															width={7}
														/>
														<span
															className={`text-[7px] font-normal  ${statusStyles.text}`}
														>
															{statusStyles.label}
														</span>
													</div>
													<span className="text-sm font-normal leading-5 tracking-tighter break-words">
														{application.title}
													</span>
												</button>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									);
								})
							) : (
								<SidebarMenuSubItem>
									<div className="px-3 py-2 text-sm text-app-gray-600" data-testid="recent-app-item">
										No recent applications
									</div>
								</SidebarMenuSubItem>
							)}
						</SidebarMenuSub>
					</CollapsibleContent>
				</SidebarMenuItem>
			</Collapsible>
			<Collapsible
				className="group/collapsible"
				onOpenChange={(isOpen) => {
					setActiveCollapsible(isOpen ? "settings" : null);
				}}
				open={activeCollapsible === "settings"}
			>
				<SidebarMenuItem className="flex flex-col gap-4">
					<CollapsibleTrigger asChild>
						<SidebarMenuButton
							className="flex items-center gap-2 hover:!bg-transparent data-[active=true]:!bg-transparent"
							data-testid="settings-trigger"
							isActive={isSettingsActive}
							onClick={handleExpandSidebar}
							tooltip="Settings"
						>
							<SettingsIcon
								className={`size-4 shrink-0 group-data-[collapsible=icon]:hidden ${
									isSettingsActive
										? "text-primary"
										: "text-primary group-data-[state=closed]/collapsible:text-app-gray-700"
								}`}
							/>
							<SettingsIcon
								className={`size-4 shrink-0 hidden group-data-[collapsible=icon]:block ${
									isSettingsActive ? "text-primary" : "text-app-gray-700"
								}`}
							/>
							<span
								className={`group-data-[collapsible=icon]:hidden text-sm font-normal ${
									isSettingsActive
										? "text-primary"
										: "text-primary group-data-[state=closed]/collapsible:text-app-black"
								}`}
							>
								Settings
							</span>
							<ChevronRight className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
					<CollapsibleContent className="group-data-[collapsible=icon]:hidden">
						<SidebarMenuSub className="flex flex-col gap-4 border-l-0 p-0 ">
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
										Organisation Settings
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
									isActive={pathname === routes.organization.settings.personal()}
								>
									<Link
										data-testid="organization-settings-personal"
										href={routes.organization.settings.personal()}
										onClick={(e) => {
											handleSettingsClick(e, routes.organization.settings.personal());
										}}
									>
										Personal Settings
									</Link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
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
