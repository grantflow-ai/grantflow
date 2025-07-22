"use client";

import { HelpCircle, LogOut, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import NewApplicationModal from "@/components/organizations/modals/new-application-modal";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOrganizationStore } from "@/stores/organization-store";
import { useUserStore } from "@/stores/user-store";
import { CustomSidebarTrigger } from "./customer-trigger";
import { NavMain } from "./nav-main";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const router = useRouter();
	const setUser = useUserStore((state) => state.setUser);
	const organization = useOrganizationStore((state) => state.organization);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { state, isMobile } = useSidebar();

	const handleLogout = () => {
		// Clear user data
		setUser(null);
		// Redirect to login
		router.push("/login");
	};

	const handleCreateApplication = () => {
		setIsModalOpen(false);
	};
	return (
		<>
			<Sidebar
				collapsible="icon"
				{...props}
				className="!border-r-0 flex h-full flex-col bg-preview-bg p-3 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:p-2 [&>div]:!border-0 [&>div]:!border-r-0 [&>div>div]:!border-0 [&>div>div]:!border-r-0 [&>div]:!border-l-0 [&>div]:!shadow-none"
			>
				<SidebarHeader className="flex flex-col mb-10 group-data-[collapsible=icon]:p-0">
					<div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
						<div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
							<div className="flex items-center gap-2">
								<div className="size-[31px] shrink-0">
									<Image
										alt="logo"
										className="w-full h-full object-cover"
										data-testid="sidebar-logo"
										height={100}
										src="/assets/logo-horizontal.svg"
										width={100}
									/>
								</div>
								<h2
									className="text-2xl font-medium leading-[30px] group-data-[collapsible=icon]:hidden"
									data-testid="sidebar-title"
								>
									GrantFlow
								</h2>
							</div>
							<div className="group-data-[collapsible=icon]:hidden">
								<CustomSidebarTrigger data-testid="sidebar-trigger" />
							</div>
						</div>
					</div>
					<div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
						<CustomSidebarTrigger data-testid="sidebar-trigger-collapsed" />
					</div>
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								className="bg-primary text-white rounded px-4 py-2 flex items-center justify-center gap-1 hover:bg-link-hover-dark transition-colors mt-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
								data-testid="new-application-button"
								onClick={() => {
									setIsModalOpen(true);
								}}
								type="button"
							>
								<Plus className="size-4 shrink-0" />
								<span className="group-data-[collapsible=icon]:hidden font-button">New Application</span>
							</button>
						</TooltipTrigger>
						<TooltipContent
							align="center"
							hidden={state !== "collapsed" || isMobile}
							side="right"
						>
							<p>New Application</p>
						</TooltipContent>
					</Tooltip>
				</SidebarHeader>

				<SidebarContent className="flex-grow gap-0 ">
					<NavMain data-testid="nav-main" userRole={organization?.role} />
				</SidebarContent>

				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								className="flex items-center gap-2"
								data-testid="support-button"
								tooltip="Support"
							>
								<HelpCircle className="size-4 shrink-0" />
								<span className="group-data-[collapsible=icon]:hidden font-body">Support</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton
								className="flex items-center gap-2"
								data-testid="logout-button"
								onClick={handleLogout}
								tooltip="Logout"
							>
								<LogOut className="size-4 shrink-0" />
								<span className="group-data-[collapsible=icon]:hidden font-body">Logout</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>

				{/* <SidebarRail className="hidden" /> */}
			</Sidebar>

			<NewApplicationModal
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
				}}
				onCreate={handleCreateApplication}
			/>
		</>
	);
}
