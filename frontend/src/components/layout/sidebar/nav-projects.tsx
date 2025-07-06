import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function NavProjects() {
	return (
		<SidebarGroup>
			<SidebarMenu>
				<Collapsible className="group/collapsible">
					<SidebarMenuItem>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton
								className="bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-700"
								data-testid="workspace-trigger"
							>
								<div className="size-4 bg-red-500" data-testid="workspace-icon" />
								<span data-testid="workspace-label">My Workspace</span>
								<ChevronRight
									className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
									data-testid="workspace-chevron"
								/>
							</SidebarMenuButton>
						</CollapsibleTrigger>
						<CollapsibleContent data-testid="workspace-content">
							<div className="p-2 space-y-2">
								<main className="flex flex-col gap-4">
									<div
										className="p-2 rounded-md bg-gray-50 flex flex-col gap-1"
										data-testid="workspace-item-account"
									>
										<p className="text-sm text-gray-700 font-normal">Account Setting </p>
									</div>
									<div
										className="p-2 rounded-md bg-gray-50 flex flex-col gap-1"
										data-testid="workspace-item-billing"
									>
										<p className="text-sm text-gray-700 font-normal">Billing and payments</p>
									</div>
									<div
										className="p-2 rounded-md bg-gray-50 flex flex-col gap-1"
										data-testid="workspace-item-members"
									>
										<p className="text-sm text-gray-700 font-normal">Members</p>
									</div>
									<div
										className="p-2 rounded-md bg-gray-50 flex flex-col gap-1"
										data-testid="workspace-item-notifications"
									>
										<p className="text-sm text-gray-700 font-normal">Notifications</p>
									</div>
								</main>
							</div>
						</CollapsibleContent>
					</SidebarMenuItem>
				</Collapsible>
			</SidebarMenu>
		</SidebarGroup>
	);
}
