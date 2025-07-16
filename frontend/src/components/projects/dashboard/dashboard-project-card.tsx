"use client";

import { Copy, MoreVertical, Trash2 } from "lucide-react";
import Image from "next/image";
import { AppCard, AppCardContent, AvatarGroup } from "@/components/app";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { API } from "@/types/api-types";

interface DashboardProjectCardProps {
	onClick?: (projectId: string) => void;
	onDelete?: (projectId: string) => void;
	onDuplicate?: (projectId: string) => void;
	project: API.ListProjects.Http200.ResponseBody[0];
	projectTeamMembers: {
		backgroundColor: string;
		imageUrl?: string;
		initials: string;
	}[];
}

export function DashboardProjectCard({
	onClick,
	onDelete,
	onDuplicate,
	project,
	projectTeamMembers,
}: DashboardProjectCardProps) {
	return (
		<AppCard
			className=" h-[300px] bg-preview-bg cursor-pointer border-2 border-gray-200 shadow-none rounded-[8px] focus:border-2 focus:border-primary  hover:border-2 hover:border-primary hover:shadow-none "
			data-testid="dashboard-project-card"
			onClick={
				onClick
					? () => {
							onClick(project.id);
						}
					: undefined
			}
		>
			<AppCardContent className=" flex h-full">
				<div className="flex flex-col w-full">
					<div className="flex flex-col gap-3">
						<figure
							className="px-2 gap-1 bg-app-gray-100 text-app-dark-blue w-fit items-center flex rounded-[20px] text-[12px] leading-[18px] py-0 font-body"
							data-testid="project-card-figure"
						>
							<div className="relative shrink-0 size-3">
								<Image
									alt="Applications"
									className="size-3 object-cover"
									data-testid="project-card-icon"
									height={12}
									src="/icons/note_stack.svg"
									width={12}
								/>
							</div>
							<span className="leading-[18px] text-[12px]">
								{getApplicationCountText(project.applications_count)}
							</span>
						</figure>
						<DropdownMenu>
							<DropdownMenuTrigger
								className="cursor-pointer"
								data-testid="project-card-menu-trigger"
								onClick={(e) => {
									e.stopPropagation();
								}}
							>
								<MoreVertical className="size-4 text-app-gray-700" />
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[200px] rounded-[5px] bg-white border border-app-gray-100 shadow-[1px_1px_3px_0px_rgba(225,223,235,0.2)] p-0"
								data-testid="project-card-menu"
							>
								<DropdownMenuItem
									className="p-3 font-body font-normal text-base text-app-gray-300 flex items-center gap-2.5 cursor-pointer hover:bg-app-gray-100/50 data-[highlighted]:bg-app-gray-100/50"
									data-testid="project-card-delete"
									onClick={(e) => {
										e.stopPropagation();
										onDelete?.(project.id);
									}}
								>
									<Trash2 className="size-4 text-app-gray-300" />
									Delete
								</DropdownMenuItem>
								<DropdownMenuItem
									className="p-3 font-body font-normal text-base text-app-black flex items-center gap-2.5 cursor-pointer hover:bg-app-gray-100/50 data-[highlighted]:bg-app-gray-100/50 rounded-bl-[4px] rounded-br-[4px]"
									data-testid="project-card-duplicate"
									onClick={(e) => {
										e.stopPropagation();
										onDuplicate?.(project.id);
									}}
								>
									<Copy className="size-4 text-app-gray-600" />
									Duplicate
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<div className="flex flex-col gap-2 w-[311px]">
						<h4
							className="font-heading font-medium text-[24px] leading-[30px] text-app-black"
							data-testid="project-card-title"
						>
							{project.name}
						</h4>
						<p
							className="text-app-gray-600 text-base font-body font-normal"
							data-testid="project-card-description"
						>
							{project.description}
						</p>
					</div>
				</div>
				<div className="flex items-center" data-testid="project-card-avatar-group">
					<AvatarGroup size="md" users={projectTeamMembers} />
				</div>
			</AppCardContent>
		</AppCard>
	);
}

function getApplicationCountText(count: number): string {
	if (count === 0) {
		return "You have no applications yet";
	}
	const plural = count > 1 ? "s" : "";
	return `${count} application${plural}`;
}
