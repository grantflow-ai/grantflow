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
					<div className="relative flex shrink-0 flex-row items-center justify-start gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									className="relative shrink-0 size-8 rounded-sm bg-[#f6f5f9]"
									onClick={onInviteCollaborators}
									type="button"
								>
									<div className="flex size-full flex-row items-center justify-center">
										<div className="flex size-8 flex-row items-center justify-center gap-1 p-1">
											<div className="relative shrink-0 size-4">
												<Plus className="size-4" />
											</div>
										</div>
									</div>
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Invite collaborators</p>
							</TooltipContent>
						</Tooltip>
						<AvatarGroup size="md" users={teamMembers} />
					</div>
					<button className="relative shrink-0 rounded bg-[#1e13f8]" onClick={onCreateProject} type="button">
						<div className="flex size-full flex-row items-center justify-center">
							<div className="flex flex-row items-center justify-center gap-1 px-4 py-2">
								<div className="relative shrink-0 size-4">
									<Plus className="size-4 text-white" />
								</div>
								<div className="relative flex shrink-0 flex-col justify-center whitespace-nowrap text-[16px] font-normal leading-[0] text-white font-['Sora']">
									<p className="block whitespace-pre leading-[22px]">New Research Project</p>
								</div>
							</div>
						</div>
					</button>
				</div>
			</div>
		</div>
	);
}
