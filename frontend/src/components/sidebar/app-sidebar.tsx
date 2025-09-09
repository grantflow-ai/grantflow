"use client";

import { HelpCircle, LogOut, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNewApplicationModalStore } from "@/stores/new-application-modal-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useUserStore } from "@/stores/user-store";
import { routes } from "@/utils/navigation";
import { CustomSidebarTrigger } from "./customer-trigger";
import { NavMain } from "./nav-main";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	hidden?: boolean;
}

export function AppSidebar({ hidden = false, ...props }: AppSidebarProps) {
	const router = useRouter();
	const setUser = useUserStore((state) => state.setUser);
	const organization = useOrganizationStore((state) => state.organization);
	const { openModal } = useNewApplicationModalStore();
	const { isMobile, state } = useSidebar();

	const handleLogout = () => {
		setUser(null);
		router.push("/login");
	};
	const handleSettingsClick = (e: React.MouseEvent, href: string) => {
		e.preventDefault();

		router.push(href);
	};

	if (hidden) {
		return null;
	}

	return (
		<Sidebar
			collapsible="icon"
			{...props}
			className="!border-r-0 flex h-full flex-col bg-preview-bg p-3 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:p-2 [&>div]:!border-0 [&>div]:!border-r-0 [&>div>div]:!border-0 [&>div>div]:!border-r-0 [&>div]:!border-l-0 [&>div]:!shadow-none"
		>
			<SidebarHeader className="flex flex-col mb-10 group-data-[collapsible=icon]:p-0">
				<header className="flex flex-col gap-2">
					<div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
						<div className="flex items-center justify-between w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
							<div className="flex items-center gap-2">
								<Link href={routes.organization.root()}>
								
								<div className="size-[31px] shrink-0">
									<Image
										alt="logo"
										className="w-full h-full object-contain"
										data-testid="sidebar-logo"
										height={31}
										src="/assets/logo-horizontal.svg"
										width={31}
									/>
								</div>
								<Image
									alt="logo"
									className="w-full h-full object-contain group-data-[collapsible=icon]:hidden"
									data-testid="sidebar-logo"
									height={31}
									src="/assets/grantflow.svg"
									width={31}
								/>
								</Link>
								
							</div>
							<div className="group-data-[collapsible=icon]:hidden">
								<CustomSidebarTrigger data-testid="sidebar-trigger" />
							</div>
						</div>
					</div>
					<div className="hidden group-data-[collapsible=icon]:block w-fit h-fit mx-auto">
						<CustomSidebarTrigger data-testid="sidebar-trigger-collapsed" />
					</div>
				</header>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							className="bg-primary text-white rounded px-4 py-2 flex items-center justify-center gap-1 hover:bg-link-hover-dark transition-colors mt-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
							data-testid="new-application-button"
							onClick={openModal}
							type="button"
						>
							<Plus className="size-4 shrink-0" />
							<span className="group-data-[collapsible=icon]:hidden ">New Application</span>
						</button>
					</TooltipTrigger>
					<TooltipContent
						align="center"
						hidden={state !== "collapsed" || isMobile}
						side="right"
						sideOffset={11}
					>
						<p>New Application</p>
					</TooltipContent>
				</Tooltip>
			</SidebarHeader>

			<SidebarContent className="flex-grow gap-0 ">
				<NavMain data-testid="nav-main" userRole={organization?.role} />
			</SidebarContent>

			<SidebarFooter className="flex flex-col mb-10 group-data-[collapsible=icon]:p-0">
				<SidebarMenu className="flex flex-col gap-3 ">
					<SidebarMenuItem className=" px-0">
						<SidebarMenuButton
							className="flex items-center gap-2 group-data-[collapsible=icon]:!px-0"
							data-testid="support-button"
						>
							{organization?.role === "COLLABORATOR" ? (
								<div className="flex items-center gap-2 w-full cursor-default">
									<div className="size-4 flex justify-center items-center rounded border-dashed border border-gray-300  group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:h-[27px]">
										<Plus className="size-3 shrink-0 text-gray-600" />
									</div>
									<span className="group-data-[collapsible=icon]:hidden ">Organisation name</span>
								</div>
							) : (
								<Link
									className="flex items-center gap-2 w-full"
									href={`${routes.organization.settings.account()}?focus=name`}
									onClick={(e) => {
										handleSettingsClick(e, `${routes.organization.settings.account()}?focus=name`);
									}}
								>
									<div className="size-4 flex justify-center items-center rounded border-dashed border border-gray-300  group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:h-[27px]">
										<Plus className="size-3 shrink-0 text-gray-600" />
									</div>
									<span className="group-data-[collapsible=icon]:hidden ">
										{organization?.name ?? "Organisation name"}
									</span>
								</Link>
							)}
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							className="flex items-center gap-2"
							data-testid="support-button"
							tooltip="Support"
						>
							<HelpCircle className="size-4 shrink-0" />
							<span className="group-data-[collapsible=icon]:hidden ">Support</span>
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
							<span className="group-data-[collapsible=icon]:hidden ">Logout</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
