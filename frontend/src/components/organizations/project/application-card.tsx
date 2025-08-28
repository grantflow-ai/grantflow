import { differenceInDays, format } from "date-fns";
import { Copy, MoreVertical, Trash2 } from "lucide-react";
import Image from "next/image";
import { AppButton } from "@/components/app/buttons/app-button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { API } from "@/types/api-types";

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
	onDelete: (id: string) => void;
	onDuplicate: (id: string, currentTitle: string) => void;
	onOpen: (applicationId: string, applicationTitle: string) => void;
}

export function ApplicationCard({ application, onDelete, onDuplicate, onOpen }: ApplicationCardProps) {
	function getRemainingTime(deadline: string) {
		const totalDays = differenceInDays(new Date(deadline), new Date());
		if (totalDays < 0) return <span>Deadline passed</span>;
		const weeks = Math.floor(totalDays / 7);
		const days = totalDays % 7;
		if (weeks > 0 && days > 0) {
			return (
				<>
					<span className="font-semibold">{weeks}</span> weeks and{" "}
					<span className="font-semibold">{days}</span>
				</>
			);
		}
		if (weeks > 0) {
			return <span className="font-semibold">{weeks} weeks</span>;
		}
		return <span className="font-semibold">{days} weeks</span>;
	}
	const statusStyles = statusStyleMap[application.status];
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

					<div>
						<DropdownMenu modal={false}>
							<DropdownMenuTrigger
								className="-mt-2 cursor-pointer"
								data-testid="project-card-menu-trigger"
							>
								<MoreVertical className="size-4 text-app-gray-600" />
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[200px] rounded-sm border border-app-gray-200 bg-white p-0 shadow-none group"
								data-testid="project-card-menu"
							>
								<DropdownMenuItem
									className="p-3 font-normal text-base text-gray-700 flex items-center gap-2  cursor-pointer data-[highlighted]:bg-primary data-[highlighted]:!text-white transition-colors group-hover:text-gray-400 group"
									data-testid="project-card-delete"
									onClick={() => {
										onDelete(application.id);
									}}
								>
									<Trash2 className="size-4 text-gray-700 group-data-[highlighted]:text-white" />
									Delete
								</DropdownMenuItem>
								<DropdownMenuItem
									className="p-3 font-normal text-base text-gray-700 flex items-center gap-2  cursor-pointer data-[highlighted]:bg-primary data-[highlighted]:!text-white transition-colors group-hover:text-gray-400 group"
									data-testid="project-card-duplicate"
									onClick={() => {
										onDuplicate(application.id, application.title);
									}}
								>
									<Copy className="size-4 text-gray-700 group-data-[highlighted]:text-white" />
									Duplicate
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
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

			<main className="flex h-full w-full items-end justify-between pt-3">
				{application.deadline && (
					<div className="w-[237px] bg-app-lavender-gray px-2 py-1 flex gap-0.5 rounded-[2px]">
						<div>
							<Image alt="Application deadline" height={16} src="/icons/deadline.svg" width={16} />
						</div>
						<p className="text-sm font-normal font-sans text-app-black">
							{getRemainingTime(application.deadline)}to the deadline
						</p>
					</div>
				)}

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
			</main>
		</div>
	);
}
