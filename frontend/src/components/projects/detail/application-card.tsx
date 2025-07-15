import { format } from "date-fns";
import { Copy, MoreVertical, Trash2 } from "lucide-react";
import Image from "next/image";
import { IconHourglass } from "@/components/about/icons";
import { AppButton } from "@/components/app";
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
	COMPLETED: {
		bg: "bg-primary",
		icon: "/icons/working-draft-white.svg",
		label: "Generating",
		text: "text-white",
	},
	DRAFT: {
		bg: "bg-app-dark-blue",
		icon: "/icons/piechart.svg",
		label: "Working Draft",
		text: "text-white",
	},
	IN_PROGRESS: {
		bg: "bg-app-gray-200",
		icon: "/icons/draft-in-progress.svg",
		label: "In Progress",
		text: "text-app-dark-blue",
	},
};

interface ApplicationCardProps {
	application: API.ListApplications.Http200.ResponseBody["applications"][0];
	onDelete: (id: string) => void;
	onOpen: (applicationId: string, applicationTitle: string) => void;
}

export function ApplicationCard({ application, onDelete, onOpen }: ApplicationCardProps) {
	const statusStyles = statusStyleMap[application.status];
	return (
		<div
			className="relative flex h-[206px] flex-col rounded-lg border px-4 py-4"
			data-testid={`application-card-${application.id}`}
			style={{ backgroundColor: "#FAF9FB", borderColor: "#E1DFEB" }}
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
						<span className="text-[10px] font-normal text-app-gray-600">
							Last edited {format(new Date(application.updated_at), "dd.MM.yy")}
						</span>
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
								className="w-[200px] rounded-sm border border-app-gray-200 bg-white p-0 shadow-none"
								data-testid="project-card-menu"
							>
								<DropdownMenuItem
									className="flex cursor-pointer items-center gap-2 p-3 font-normal text-base text-app-gray-600 data-[highlighted]:bg-transparent data-[highlighted]:text-app-gray-600"
									data-testid="project-card-delete"
									onClick={() => {
										onDelete(application.id);
									}}
								>
									<Trash2 className="size-4 text-app-gray-600" />
									Delete
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex cursor-pointer items-center gap-2 p-3 font-normal text-base text-app-gray-600 data-[highlighted]:bg-transparent data-[highlighted]:text-app-gray-600"
									data-testid="project-card-duplicate"
								>
									<Copy className="size-4 text-app-gray-600" />
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
				<div className=" w-full">
					{application.deadline && (
						<div
							className="flex items-center rounded-xs w-fit bg-app-lavender-gray px-2 py-1"
							data-testid={`application-card-deadline-${application.id}`}
						>
							<IconHourglass className="size-4 rotate-180 text-app-black" />
							<p className="text-sm font-normal text-app-black">{application.deadline}</p>
						</div>
					)}
				</div>

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
