"use client";

import Image from "next/image";
import { AvatarGroup } from "@/components/app/app-avatar";
import { AppCard, AppCardContent } from "@/components/app/app-card";
import type { API } from "@/types/api-types";
import { CardActionMenu } from "./card-action-menu";

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
			className=" h-[300px] bg-preview-bg cursor-pointer hover:border-primary rounded shadow-none border-2 border-gray-200"
			data-testid="dashboard-project-card"
			onClick={
				onClick
					? () => {
							onClick(project.id);
						}
					: undefined
			}
		>
			<AppCardContent className="flex h-full">
				<div className="flex flex-col w-full">
					<div className="flex flex-col gap-3">
						<figure
							className="px-2 gap-1 bg-gray-100 text-app-dark-blue w-fit items-center flex rounded-[20px]"
							data-testid="project-card-figure"
						>
							<div className="size-3">
								<Image
									alt="No projects"
									className="w-full h-full object-cover"
									data-testid="project-card-icon"
									height={100}
									src="/icons/note_stack.svg"
									width={100}
								/>
							</div>
							<span className="font-normal text-xs capitalize">
								{getApplicationCountText(project.applications_count)}
							</span>
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
					<CardActionMenu
						onDelete={() => onDelete?.(project.id)}
						onDuplicate={() => onDuplicate?.(project.id)}
					/>
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
