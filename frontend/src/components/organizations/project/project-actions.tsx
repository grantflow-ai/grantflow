import { Plus, SearchIcon } from "lucide-react";
import type { FC } from "react";
import { AvatarGroup } from "@/components/app/app-avatar";
import { AppButton } from "@/components/app/buttons/app-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProjectActionsProps {
	currentUserRole?: "ADMIN" | "COLLABORATOR" | "OWNER";
	isCreatingApplication: boolean;
	onCreateApplication: () => void;
	onSearchQueryChange: (query: string) => void;
	onShowInviteModal: () => void;
	searchQuery: string;
	teamMembers: { backgroundColor: string; imageUrl?: string; initials: string; uid: string }[];
}

const ProjectActions: FC<ProjectActionsProps> = ({
	currentUserRole,
	isCreatingApplication,
	onCreateApplication,
	onSearchQueryChange,
	onShowInviteModal,
	searchQuery,
	teamMembers,
}) => (
	<div className="flex items-center gap-3">
		<div className="flex justify-end items-center gap-1">
			{(currentUserRole === "ADMIN" || currentUserRole === "OWNER") && (
				<button
					className="size-8 flex items-center justify-center cursor-pointer bg-app-gray-100/50 rounded-sm hover:bg-app-gray-100 transition-colors p-1"
					data-testid="invite-collaborators-button"
					onClick={onShowInviteModal}
					type="button"
				>
					<Tooltip>
						<TooltipTrigger asChild>
							<Plus className="size-4 text-app-gray-600" />
						</TooltipTrigger>
						<TooltipContent className="bg-app-dark-blue px-3 py-1 rounded-sm">
							<p className="text-white font-body font-normal text-sm">Invite collaborators</p>
						</TooltipContent>
					</Tooltip>
				</button>
			)}
			<div>
				<AvatarGroup data-testid="project-avatar-group" size="md" users={teamMembers} />
			</div>
		</div>
		<div className="relative w-80">
			<SearchIcon className="absolute right-3 top-1/2 size-3 -translate-y-1/2 text-[#636170]" />
			<input
				className="w-full h-10 rounded-[4px] px-3 border border-[#e1dfeb] bg-white text-[14px] text-base text-black placeholder:text-gray-400 placeholder:font-normal placeholder:text-sm outline-none focus:border-[#1e13f8]"
				data-testid="application-search-input"
				onChange={(e) => { onSearchQueryChange(e.target.value); }}
				placeholder="Search by application name or content"
				value={searchQuery}
			/>
		</div>
		<AppButton
			className="px-4 py-2"
			data-testid="new-application-button"
			disabled={isCreatingApplication}
			onClick={onCreateApplication}
			type="button"
			variant="primary"
		>
			<Plus className="size-4" />
			<p className="font-normal text-base">New Application</p>
		</AppButton>
	</div>
);

export default ProjectActions;
