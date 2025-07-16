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
							className="px-2 gap-1 bg-gray-100 text-app-dark-blue w-fit items-center flex rounded-[20px]"
							data-testid="project-card-figure"
						>
							<div className="size-3">
								<Image
									alt="Applications"
									className="w-full h-full object-cover"
									data-testid="project-card-icon"
									height={100}
									src="/icons/note_stack.svg"
									width={100}
								/>
							</div>
							{getApplicationCountText(project.applications_count)}
						</figure>
						<div className="flex flex-col gap-2">
							<h4 className="font-medium text-2xl text-black" data-testid="project-card-title">
								{project.name}
							</h4>
							<p className="text-gray-600 text-base font-normal" data-testid="project-card-description">
								{project.description}
							</p>
						</div>
					</div>
					<div className="flex items-end h-full">
						<div className="flex items-center " data-testid="project-card-avatar-group">
							<AvatarGroup size="md" users={projectTeamMembers} />
						</div>
					</div>
				</div>
				<div>
					<DropdownMenu>
						<DropdownMenuTrigger
							className="-mt-2 cursor-pointer"
							data-testid="project-card-menu-trigger"
							onClick={(e) => {
								e.stopPropagation();
							}}
						>
							<MoreVertical className="size-4 text-gray-700 " />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-[200px] rounded-sm bg-white border border-gray-200 shadow-none p-0"
							data-testid="project-card-menu"
						>
							<DropdownMenuItem
								className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700"
								data-testid="project-card-delete"
								onClick={(e) => {
									e.stopPropagation();
									onDelete?.(project.id);
								}}
							>
								<Trash2 className="size-4 text-gray-700" />
								Delete
							</DropdownMenuItem>
							<DropdownMenuItem
								className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700"
								data-testid="project-card-duplicate"
								onClick={(e) => {
									e.stopPropagation();
									onDuplicate?.(project.id);
								}}
							>
								<Copy className="size-4 text-gray-700" />
								Duplicate
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
