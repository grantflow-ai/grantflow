import { format } from "date-fns";
import Image from "next/image";
import { AppButton } from "@/components/app/buttons/app-button";
import { APPLICATION_STATUS } from "@/constants/download";
import type { API } from "@/types/api-types";
import type { DownloadFormat } from "@/types/download";
import { getDeadlineInfo } from "@/utils/date-time";
import { CardActionMenu } from "../dashboard/card-action-menu";
import { ApplicationDownloadMenu } from "./application-download-menu";

type ApplicationStatus = API.ListApplications.Http200.ResponseBody["applications"][0]["status"];

interface StatusStyle {
	bg: string;
	icon: string;
	label: string;
	text: string;
}

const statusStyleMap: Record<ApplicationStatus, StatusStyle> = {
	CANCELLED: {
		bg: "bg-red-500",
		icon: "/icons/close.svg",
		label: "Cancelled",
		text: "text-white",
	},
	GENERATING: {
		bg: "bg-primary",
		icon: "/icons/piechart.svg",
		label: "Generating",
		text: "text-white",
	},
	IN_PROGRESS: {
		bg: "bg-app-gray-200",
		icon: "/icons/draft-in-progress.svg",
		label: "In Progress",
		text: "text-app-dark-blue",
	},
	WORKING_DRAFT: {
		bg: "bg-app-dark-blue",
		icon: "/icons/working-draft-white.svg",
		label: "Working Draft",
		text: "text-white",
	},
};

interface ApplicationCardProps {
	application: API.ListApplications.Http200.ResponseBody["applications"][0];
	isDownloading?: boolean;
	onDelete: (id: string) => void;
	onDownload: (applicationId: string, format: DownloadFormat) => void;
	onDuplicate: (id: string, currentTitle: string) => void;
	onOpen: (applicationId: string, applicationTitle: string) => void;
}

export function ApplicationCard({
	application,
	isDownloading = false,
	onDelete,
	onDownload,
	onDuplicate,
	onOpen,
}: ApplicationCardProps) {
	const deadlineInfo = getDeadlineInfo(application.deadline);
	const statusStyles = statusStyleMap[application.status];
	const isDownloadEnabled = application.status === APPLICATION_STATUS.WORKING_DRAFT;
	return (
		<div
			className="relative flex h-[206px] flex-col rounded-lg border px-4 py-4 bg-preview-bg border-[#E1DFEB] hover:border-primary hover:border-2 transition-all"
			data-testid={`application-card-${application.id}`}
		>
			<header className="flex flex-col gap-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-1">
						<div
							className={`flex w-fit items-center gap-2 rounded-[20px] px-2 py-1 ${statusStyles.bg}`}
							data-testid={`application-card-status-${application.id}`}
						>
							<div className="size-3 rounded-full">
								<Image
									alt={`${statusStyles.label} icon`}
									height={12}
									src={statusStyles.icon}
									width={12}
								/>
							</div>
							<span className={`text-xs font-normal ${statusStyles.text}`}>{statusStyles.label}</span>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-[10px] font-normal text-app-gray-600">
								Last edited {format(new Date(application.updated_at), "dd.MM.yy")}
							</span>
						</div>
					</div>

					<div className="flex items-center pt-2 gap-3">
						{isDownloadEnabled && (
							<ApplicationDownloadMenu
								disabled={isDownloading}
								onDownload={(format) => {
									onDownload(application.id, format);
								}}
							/>
						)}
						<CardActionMenu
							onDelete={() => {
								onDelete(application.id);
							}}
							onDuplicate={() => {
								onDuplicate(application.id, application.title);
							}}
						/>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="size-[19px] rounded-full bg-app-gray-300" />
					<h3
						className="text-base font-semibold leading-[22px] text-app-black"
						data-testid={`application-card-title-${application.id}`}
					>
						{application.title}
					</h3>
				</div>

				{application.description && (
					<p
						className="text-sm font-normal leading-[20px] text-app-gray-600"
						data-testid={`application-card-description-${application.id}`}
					>
						{application.description}
					</p>
				)}
			</header>

			<main className="flex h-full w-full items-end pt-3">
				{application.deadline && (
					<div className="w-fit bg-app-lavender-gray px-2 py-1 flex gap-0.5 rounded-[2px]">
						<div>
							<Image alt="Application deadline" height={16} src="/icons/deadline.svg" width={16} />
						</div>
						<p className="text-sm font-normal font-sans text-app-black">
							{deadlineInfo.status === "passed" && <span>Deadline passed</span>}
							{deadlineInfo.status === "active" && deadlineInfo.timeBreakdown && (
								<>
									{deadlineInfo.timeBreakdown.weeks > 0 && (
										<span className="font-semibold">{deadlineInfo.timeBreakdown.weeks} weeks </span>
									)}
									{deadlineInfo.timeBreakdown.weeks > 0 &&
										deadlineInfo.timeBreakdown.days > 0 &&
										" and "}
									{deadlineInfo.timeBreakdown.days > 0 && (
										<span className="font-semibold">{deadlineInfo.timeBreakdown.days} days </span>
									)}
								</>
							)}
							to the deadline
						</p>
					</div>
				)}

				<div className="ml-auto flex items-center gap-2">
					<AppButton
						className="w-[97px] py-0.5 bg-white"
						data-testid={`application-card-open-button-${application.id}`}
						onClick={() => {
							onOpen(application.id, application.title);
						}}
						variant="secondary"
					>
						Open
					</AppButton>
				</div>
			</main>
		</div>
	);
}
