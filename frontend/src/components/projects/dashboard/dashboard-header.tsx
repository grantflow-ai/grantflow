"use client";

import { Plus } from "lucide-react";

import { AvatarGroup } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardHeaderProps {
	onCreateProject?: () => void;
	onInviteCollaborators?: () => void;
}

const teamMembers = [
	{ backgroundColor: "#369e94", initials: "NH" },
	{ backgroundColor: "#9747ff", initials: "AR" },
	{ backgroundColor: "#5179fc", initials: "VT" },
];

export function DashboardHeader({ onCreateProject, onInviteCollaborators }: DashboardHeaderProps) {
	return (
		<div className="relative h-[73px] w-full shrink-0">
			<div className="relative flex size-full flex-row items-center justify-end px-6">
				<div className="relative flex h-[73px] w-full flex-row items-center justify-end gap-6 py-6">
					<div className="relative flex shrink-0 flex-row items-center justify-start gap-3">
						<button
							className="flex h-12 items-center gap-2 rounded-lg bg-action-secondary px-4 py-3 text-[16px] font-medium leading-[22px] text-white hover:bg-action-secondary/90 font-button"
							onClick={onInviteCollaborators}
							type="button"
						>
							Invite collaborators
						</button>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									className="relative shrink-0 size-8 rounded-sm bg-surface-secondary flex items-center justify-center"
									onClick={onInviteCollaborators}
									type="button"
								>
									<Plus className="size-4 text-text-secondary" />
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Add collaborator</p>
							</TooltipContent>
						</Tooltip>
						<AvatarGroup size="md" users={teamMembers} />
					</div>
					<button
						className="flex h-12 items-center gap-2 rounded-lg bg-action-primary px-4 py-3 text-[16px] font-medium leading-[22px] text-white hover:bg-action-primary/90 font-button"
						onClick={onCreateProject}
						type="button"
					>
						<Plus className="size-4 text-white" />
						New Research Project
					</button>
				</div>
			</div>
		</div>
	);
}
