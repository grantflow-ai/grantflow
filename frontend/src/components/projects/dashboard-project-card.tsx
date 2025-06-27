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

	return (
		<div className="relative h-[300px] w-[413.33px] shrink-0 rounded bg-[#faf9fb]">
			<div className="relative size-full overflow-clip">
				<div className="relative flex h-[300px] w-[413.33px] flex-col items-start justify-between p-6">
					<div className="relative flex shrink-0 flex-col items-start justify-start gap-3">
						<div className="relative shrink-0 rounded-[20px] bg-[#e1dfeb]">
							<div className="relative flex size-full flex-row items-center">
								<div className="relative flex flex-row items-center justify-start gap-1 px-2 py-0">
									<List className="relative shrink-0 size-3 text-[#211968]" />
									<div className="relative shrink-0 text-left text-[12px] leading-[0] not-italic text-[#211968] font-['Source_Sans_Pro']">
										<p className="block whitespace-pre leading-[18px]">
											{hasApplications
												? `${project.applications_count} applications`
												: "You have no applications yet"}
										</p>
									</div>
								</div>
							</div>
						</div>
						<div className="relative flex w-[311px] shrink-0 flex-col items-start justify-center gap-2 leading-[0] text-left">
							<div className="relative flex w-full shrink-0 flex-col justify-center text-[24px] font-medium text-[#000000] font-['Cabin']">
								<p className="block leading-[30px]">{project.name}</p>
							</div>
							<div className="relative flex w-full shrink-0 flex-col justify-center text-[16px] not-italic text-[#636170] font-['Source_Sans_Pro']">
								<p className="block leading-[20px]">
									{project.description ?? "Create grants applications under this research."}
								</p>
							</div>
						</div>
					</div>
					<div className="relative flex w-full shrink-0 flex-row items-center justify-between">
						<div className="relative min-h-px min-w-px grow shrink-0 basis-0 flex flex-row items-center justify-start gap-1">
							<AvatarGroup size="md" users={projectTeamMembers} />
						</div>
					</div>
					<button
						className="absolute left-[381px] top-4 size-4"
						onClick={() => {
							setShowDropdown(!showDropdown);
						}}
						type="button"
					>
						<MoreVertical className="size-4 text-[#636170]" />
					</button>
				</div>
			</div>
			<div className="pointer-events-none absolute inset-0 rounded border border-solid border-[#e1dfeb]" />

			{showDropdown && (
				<div className="absolute left-[181px] top-[54px] flex w-[200px] flex-col items-start justify-start rounded bg-white">
					<div className="pointer-events-none absolute inset-[-1px] rounded-[5px] border border-solid border-[#e1dfeb] shadow-[1px_1px_3px_0px_rgba(225,223,235,0.2)]" />
					<button
						className="relative flex h-[43px] w-[200px] shrink-0 flex-row items-center justify-start"
						onClick={() => {
							onDelete?.(project.id);
							setShowDropdown(false);
						}}
						type="button"
					>
						<div className="relative size-full min-h-px min-w-px grow shrink-0 basis-0 rounded-md">
							<div className="relative flex size-full flex-row items-center">
								<div className="relative flex size-full flex-row items-center justify-start gap-1 p-3">
									<div className="relative flex h-full shrink-0 flex-row items-center justify-start gap-2.5">
										<Trash2 className="relative shrink-0 size-4 text-[#c9c7d5]" />
									</div>
									<div className="relative flex h-full w-28 shrink-0 flex-col justify-center leading-[0] not-italic text-left text-[16px] text-[#c9c7d5] font-['Source_Sans_Pro']">
										<p className="block leading-[20px]">Delete</p>
									</div>
								</div>
							</div>
						</div>
					</button>
					<button
						className="relative flex h-[43px] w-[200px] shrink-0 flex-row items-center justify-start rounded-bl-[4px] rounded-br-[4px]"
						onClick={() => {
							onDuplicate?.(project.id);
							setShowDropdown(false);
						}}
						type="button"
					>
						<div className="relative size-full min-h-px min-w-px grow shrink-0 basis-0">
							<div className="relative flex size-full flex-row items-center">
								<div className="relative flex size-full flex-row items-center justify-start gap-1 p-3">
									<div className="relative flex shrink-0 flex-row items-center justify-start gap-2.5">
										<Copy className="relative shrink-0 size-4 text-[#2e2d36]" />
									</div>
									<div className="relative flex h-full w-[110px] shrink-0 flex-col justify-center leading-[0] not-italic text-left text-[16px] text-[#2e2d36] font-['Source_Sans_Pro']">
										<p className="block leading-[20px]">Duplicate</p>
									</div>
								</div>
							</div>
						</div>
					</button>
				</div>
			)}
		</div>
	);
}
