"use client";

import { Copy, List, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";

import { AvatarGroup } from "@/components/ui/avatar";
import type { API } from "@/types/api-types";

interface DashboardProjectCardProps {
	onDelete?: (projectId: string) => void;
	onDuplicate?: (projectId: string) => void;
	project: API.ListProjects.Http200.ResponseBody[0];
}

const projectTeamMembers = [
	{ backgroundColor: "#369e94", initials: "NH" },
	{ backgroundColor: "#9e366f", initials: "VH" },
	{ backgroundColor: "#9747ff", initials: "AR" },
];

export function DashboardProjectCard({ onDelete, onDuplicate, project }: DashboardProjectCardProps) {
	const [showDropdown, setShowDropdown] = useState(false);

	const hasApplications = project.applications_count > 0;
	const pluralSuffix = project.applications_count > 1 ? "s" : "";
	const applicationText = hasApplications
		? `${project.applications_count} Application${pluralSuffix}`
		: "You Have No Applications Yet";
	const projectDescription =
		project.description ?? "Description of research project goes here.Description of research project goes here.";

	return (
		<div className="relative h-[300px] w-[413px] shrink-0 rounded-lg bg-surface-primary border border-border-primary">
			<div className="relative size-full overflow-clip">
				<div className="relative flex h-[300px] w-[413px] flex-col items-start justify-between p-6">
					<div className="relative flex shrink-0 flex-col items-start justify-start gap-4">
						<div className="relative shrink-0 rounded-full bg-action-primary px-3 py-1">
							<div className="relative flex size-full flex-row items-center">
								<div className="relative flex flex-row items-center justify-start gap-1.5">
									<List className="relative shrink-0 size-3 text-white" />
									<div className="relative shrink-0 text-left text-[12px] leading-[18px] text-white font-body">
										{applicationText}
									</div>
								</div>
							</div>
						</div>
						<div className="relative flex w-[365px] shrink-0 flex-col items-start justify-center gap-3">
							<div className="relative flex w-full shrink-0 flex-col justify-center text-[20px] font-medium text-text-primary font-heading leading-[26px]">
								{project.name}
							</div>
							<div className="relative flex w-full shrink-0 flex-col justify-center text-[14px] text-text-secondary font-body leading-[21px]">
								{projectDescription}
							</div>
						</div>
					</div>
					<div className="relative flex w-full shrink-0 flex-row items-center justify-between">
						<div className="relative min-h-px min-w-px grow shrink-0 basis-0 flex flex-row items-center justify-start gap-1">
							<AvatarGroup size="md" users={projectTeamMembers} />
						</div>
					</div>
					<button
						className="absolute right-4 top-4 size-6 flex items-center justify-center"
						onClick={() => {
							setShowDropdown(!showDropdown);
						}}
						type="button"
					>
						<MoreVertical className="size-4 text-text-secondary" />
					</button>
				</div>
			</div>

			{showDropdown && (
				<div className="absolute right-4 top-12 z-10 flex w-[150px] flex-col items-start justify-start rounded-lg bg-surface-primary border border-border-primary shadow-lg">
					<button
						className="relative flex h-[40px] w-full shrink-0 flex-row items-center justify-start hover:bg-surface-secondary first:rounded-t-lg"
						onClick={() => {
							onDelete?.(project.id);
							setShowDropdown(false);
						}}
						type="button"
					>
						<div className="relative flex size-full flex-row items-center justify-start gap-2 px-3">
							<Trash2 className="relative shrink-0 size-4 text-app-gray-300" />
							<div className="relative text-left text-[14px] leading-[21px] text-app-gray-300 font-body">
								Delete
							</div>
						</div>
					</button>
					<button
						className="relative flex h-[40px] w-full shrink-0 flex-row items-center justify-start hover:bg-surface-secondary last:rounded-b-lg"
						onClick={() => {
							onDuplicate?.(project.id);
							setShowDropdown(false);
						}}
						type="button"
					>
						<div className="relative flex size-full flex-row items-center justify-start gap-2 px-3">
							<Copy className="relative shrink-0 size-4 text-text-primary" />
							<div className="relative text-left text-[14px] leading-[21px] text-text-primary font-body">
								Duplicate
							</div>
						</div>
					</button>
				</div>
			)}
		</div>
	);
}
