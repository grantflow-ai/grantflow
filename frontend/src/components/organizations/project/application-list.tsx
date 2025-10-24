import { Plus } from "lucide-react";
import { AppButton } from "@/components/app/buttons/app-button";
import type { API } from "@/types/api-types";
import type { DownloadFormat } from "@/types/download";
import { ApplicationCard } from "./application-card";

interface ApplicationListProps {
	applications: API.ListApplications.Http200.ResponseBody["applications"];
	downloadingApplications?: Set<string>;
	isCreatingApplication: boolean;
	isLoading: boolean;
	onCreate: () => void;
	onDelete: (id: string) => void;
	onDownload: (applicationId: string, format: DownloadFormat) => void;
	onDuplicate: (id: string, currentTitle: string) => void;
	onOpen: (application: API.ListApplications.Http200.ResponseBody["applications"][0]) => void;
	searchQuery: string;
}

export function ApplicationList({
	applications,
	downloadingApplications = new Set(),
	isCreatingApplication,
	isLoading,
	onCreate,
	onDelete,
	onDownload,
	onDuplicate,
	onOpen,
	searchQuery,
}: ApplicationListProps) {
	if (isLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center">
				<p className="text-app-gray-600">Loading applications...</p>
			</div>
		);
	}

	if (applications.length === 0) {
		if (searchQuery) {
			const buttonText = isCreatingApplication ? "Creating..." : "New Application";
			return (
				<main className="flex flex-col items-center  h-full text-center pt-32 gap-6">
					<p className="text-app-gray-600 mb-4 font-body">
						We couldn&apos;t find any applications matching your search.
					</p>
					<AppButton
						className="px-4 py-2"
						data-testid="empty-state-new-application-button"
						disabled={isCreatingApplication}
						onClick={onCreate}
						type="button"
						variant="primary"
					>
						<Plus className="size-4" />
						<span className="font-normal text-base">{buttonText}</span>
					</AppButton>
				</main>
			);
		}

		const buttonText = isCreatingApplication ? "Creating..." : "New Application";
		return (
			<main className="w-[628px] h-[206px]">
				<button
					className="flex flex-col items-center gap-2 justify-center w-full h-full bg-preview-bg rounded-[4px] border hover:border-primary border-dashed border-gray-200 cursor-pointer"
					data-testid="empty-state-new-application-button"
					disabled={isCreatingApplication}
					onClick={onCreate}
					type="button"
				>
					<div className="flex items-center justify-center size-10">
						<Plus className="size-6 text-primary" />
					</div>
					<span className="text-base font-normal text-black">{buttonText}</span>
				</button>
			</main>
		);
	}

	return (
		<main className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-auto scrollbar-hide auto-rows-min max-h-full">
			{applications.map((application) => (
				<ApplicationCard
					application={application}
					isDownloading={downloadingApplications.has(application.id)}
					key={application.id}
					onDelete={onDelete}
					onDownload={onDownload}
					onDuplicate={onDuplicate}
					onOpen={onOpen}
				/>
			))}
		</main>
	);
}
