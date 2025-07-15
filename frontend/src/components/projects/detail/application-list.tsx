import { Plus } from "lucide-react";

import type { API } from "@/types/api-types";
import { ApplicationCard } from "./application-card";

interface ApplicationListProps {
	applications: API.ListApplications.Http200.ResponseBody["applications"];
	isCreatingApplication: boolean;
	isLoading: boolean;
	onCreate: () => void;
	onDelete: (id: string) => void;
	onOpen: (applicationId: string, applicationTitle: string) => void;
	searchQuery: string;
}

export function ApplicationList({
	applications,
	isCreatingApplication,
	isLoading,
	onCreate,
	onDelete,
	onOpen,
	searchQuery,
}: ApplicationListProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-[#636170]">Loading applications...</div>
			</div>
		);
	}

	if (applications.length === 0) {
		const getEmptyStateButtonText = () => {
			if (searchQuery) return "No applications found";
			if (isCreatingApplication) return "Creating...";
			return "New Application";
		};

		return (
			<div className=" w-[628px] h-[206px]" data-testid="empty-applications-state">
				<button
					className="flex flex-col items-center gap-2 justify-center w-full h-full bg-preview-bg rounded-[4px] border border-dashed border-gray-200 cursor-pointer"
					data-testid="empty-state-new-application-button"
					disabled={isCreatingApplication}
					onClick={onCreate}
					type="button"
				>
					<div className="flex items-center justify-center size-10">
						<Plus className="size-6 text-primary" />
					</div>
					<span className="text-base font-normal text-black">{getEmptyStateButtonText()}</span>
				</button>
			</div>
		);
	}

	return (
		<main className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-auto scrollbar-hide auto-rows-min max-h-full">
			{applications.map((application) => (
				<ApplicationCard application={application} key={application.id} onDelete={onDelete} onOpen={onOpen} />
			))}
		</main>
	);
}
