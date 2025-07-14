"use client";

import { ChevronRight, Search, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useProjectStore } from "@/stores/project-store";
import { routes } from "@/utils/navigation";

export function NavMain(props: React.HTMLAttributes<HTMLButtonElement>) {
	const params = useParams();
	const { project } = useProjectStore();

	// Get current project ID from params or store
	const projectId = (params.projectId as string) || project?.id;
	const projectName = project?.name ?? "Project";
	return (
		<nav {...props}>
			<Link
				className="flex px-3 items-center pl-12 pb-6 group-data-[collapsible=icon]:pl-3 group-data-[collapsible=icon]:justify-center hover:bg-gray-50 rounded-md transition-colors"
				data-testid="dashboard-section"
				href={routes.projects()}
			>
				<div className="size-4">
					<Image
						alt="logo"
						className="w-full h-full object-cover"
						height={16}
						src="/icons/dashboard.svg"
						width={16}
					/>
				</div>
				<p className="text-black text-base font-normal ml-2 group-data-[collapsible=icon]:hidden">Dashboard</p>
			</Link>
			<SidebarGroup>
				<SidebarMenu>
					{/* Recent Applications */}
					<Collapsible className="group/collapsible" defaultOpen>
						<SidebarMenuItem>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton
									className="bg-white text-primary hover:bg-gray-100 hover:text-blue-700 font-normal text-base border border-gray-200 "
									data-testid="recent-applications-trigger"
								>
									<div className="size-4 flex-shrink-0">
										<Image
											alt="Recent Applications"
											className="w-full h-full object-cover"
											height={16}
											src="/icons/note-stack-blue.svg"
											width={16}
										/>
									</div>
									<span className="group-data-[collapsible=icon]:hidden">Recent Applications</span>
									<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
								</SidebarMenuButton>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-4 group-data-[collapsible=icon]:hidden">
								<div className="flex flex-col gap-4" data-testid="recent-app-item">
									<div className="relative">
										<Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
										<Input
											className="px-3 rounded-sm border border-gray-100 bg-white placeholder:text-sm placeholder:font-normal placeholder:text-gray-400"
											data-testid="search-input"
											placeholder="Search application"
										/>
									</div>
									<main className="flex flex-col gap-4 h-[286px] overflow-y-scroll">
										<div className="p-2 rounded-md bg-gray-50 flex flex-col gap-1">
											<div className="rounded-md flex items-center bg-primary w-fit gap-0.5 px-[4.39px]">
												<div className="size-[6px] bg-white rounded-full" />
												<p className="text-[6.59px] text-white font-normal">Generating</p>
											</div>
											<p className="text-sm text-gray-700 font-normal">
												Application name 123456...
											</p>
										</div>
										<div className="p-2 rounded-md flex flex-col gap-1">
											<div className="rounded-md flex items-center bg-gray-100 w-fit gap-0.5 px-[4.39px]">
												<div className="size-[6px] bg-blue-600 rounded-full" />
												<p className="text-[6.59px] text-blue-600 font-normal">In Progress</p>
											</div>
											<p className="text-sm text-gray-700 font-normal">
												Application name 123456...
											</p>
										</div>
										<div className="p-2 rounded-md flex flex-col gap-1">
											<div className="rounded-md flex items-center bg-slate-100 w-fit gap-0.5 px-[4.39px]">
												<div className="size-[6px] bg-slate-600 rounded-full" />
												<p className="text-[6.59px] text-slate-600 font-normal">
													Working Draft
												</p>
											</div>
											<p className="text-sm text-gray-700 font-normal">
												Application name 123456...
											</p>
										</div>
										<div className="p-2 rounded-md flex flex-col gap-1">
											<div className="rounded-md flex items-center bg-slate-100 w-fit gap-0.5 px-[4.39px]">
												<div className="size-[6px] bg-slate-600 rounded-full" />
												<p className="text-[6.59px] text-slate-600 font-normal">
													Working Draft
												</p>
											</div>
											<p className="text-sm text-gray-700 font-normal">
												Application name 123456...
											</p>
										</div>
										<div className="p-2 rounded-md bg-gray-50 flex flex-col gap-1">
											<div className="rounded-md flex items-center bg-slate-100 w-fit gap-0.5 px-[4.39px]">
												<div className="size-[6px] bg-slate-600 rounded-full" />
												<p className="text-[6.59px] text-slate-600 font-normal">
													Working Draft
												</p>
											</div>
											<p className="text-sm text-gray-700 font-normal">
												Application name 123456...
											</p>
										</div>
									</main>
								</div>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>

					{/* Settings */}
					<Collapsible className="group/collapsible" defaultOpen>
						<SidebarMenuItem>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton
									className="bg-white text-primary hover:bg-gray-100 hover:text-blue-700 font-normal text-base border border-gray-200 "
									data-testid="settings-trigger"
								>
									<Settings className="text-primary size-4 flex-shrink-0" />
									<span className="group-data-[collapsible=icon]:hidden">Settings</span>
									<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
								</SidebarMenuButton>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-4 group-data-[collapsible=icon]:hidden">
								<main className="flex flex-col gap-4 px-3">
									{projectId ? (
										<>
											<Link
												className="hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors block"
												data-testid="settings-account"
												href={routes.project.settings.account({ projectId, projectName })}
											>
												<p className="text-sm text-gray-700 font-normal">Account Setting</p>
											</Link>
											<Link
												className="hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors block"
												data-testid="settings-billing"
												href={routes.project.settings.billing({ projectId, projectName })}
											>
												<p className="text-sm text-gray-700 font-normal">
													Billing and payments
												</p>
											</Link>
											<Link
												className="hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors block"
												data-testid="settings-members"
												href={routes.project.settings.members({ projectId, projectName })}
											>
												<p className="text-sm text-gray-700 font-normal">Members</p>
											</Link>
											<Link
												className="hover:bg-gray-50 p-2 rounded-md cursor-pointer transition-colors block"
												data-testid="settings-notifications"
												href={routes.project.settings.notifications({ projectId, projectName })}
											>
												<p className="text-sm text-gray-700 font-normal">Notifications</p>
											</Link>
										</>
									) : (
										<p className="text-sm text-gray-500 p-2">No project selected</p>
									)}
								</main>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>
				</SidebarMenu>
			</SidebarGroup>
		</nav>
	);
}
