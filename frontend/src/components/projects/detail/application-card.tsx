import { Copy, MoreVertical, Trash2 } from "lucide-react";
import Image from "next/image";

import { AppButton } from "@/components/app";
import { IconHourglass } from "@/components/about/icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { API } from "@/types/api-types";

const getStatusStyles = (status: string) => {
	switch (status) {
		case "Generating": {
			return {
				bg: "bg-primary",
				icon: "/icons/piechart.svg",
				label: "Generating",
				text: "text-white",
			};
		}
		case "In Progress": {
			return {
				bg: "bg-gray-200",
				icon: "/icons/draft-in-progress.svg",
				label: "In Progress",
				text: "text-app-dark-blue",
			};
		}
		case "Working Draft": {
			return {
				bg: "bg-app-dark-blue",
				icon: "/icons/working-Draft-white.svg",
				label: "Working Draft",
				text: "text-white",
			};
		}
		default: {
			return {
				bg: "bg-gray-200",
				icon: "/icons/piechart.svg",
				label: status,
				text: "text-app-dark-blue",
			};
		}
	}
};

interface ApplicationCardProps {
	application: {
		deadline?: string;
		description?: string;
	} & API.ListApplications.Http200.ResponseBody["applications"][0];
	onDelete: (id: string) => void;
	onOpen: (applicationId: string, applicationTitle: string) => void;
}

export function ApplicationCard({ application, onDelete, onOpen }: ApplicationCardProps) {
	const statusStyles = getStatusStyles(application.status);
	return (
		<div
			className="relative flex h-[206px] flex-col rounded-[4px] border border-gray-200 bg-preview-bg px-3 py-6"
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
						<span className="text-[10px] font-normal text-gray-600">
							Last edited {formatDate(application.updated_at)}
						</span>
					</div>

					<div>
						<DropdownMenu modal={false}>
							<DropdownMenuTrigger
								className="-mt-2 cursor-pointer"
								data-testid="project-card-menu-trigger"
							>
								<MoreVertical className="size-4 text-gray-700" />
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[200px] rounded-sm border border-gray-200 bg-white p-0 shadow-none"
								data-testid="project-card-menu"
							>
								<DropdownMenuItem
									className="flex cursor-pointer items-center gap-2 p-3 font-normal text-base text-gray-700 data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700"
									data-testid="project-card-delete"
									onClick={() => onDelete(application.id)}
								>
									<Trash2 className="size-4 text-gray-700" />
									Delete
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex cursor-pointer items-center gap-2 p-3 font-normal text-base text-gray-700 data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700"
									data-testid="project-card-duplicate"
								>
									<Copy className="size-4 text-gray-700" />
									Duplicate
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="size-[19px] rounded-full bg-gray-200" />
					<h3
						className="text-base font-semibold leading-[22px] text-black"
						data-testid={`application-card-title-${application.id}`}
					>
						{application.title}
					</h3>
				</div>

				{application.description && (
					<p
						className="text-sm font-normal leading-[20px] text-gray-600"
						data-testid={`application-card-description-${application.id}`}
					>
						{application.description}
					</p>
				)}
			</header>

			<main className="flex h-full w-full items-end justify-between pt-3">
				{application.deadline && (
					<div
						className="flex items-center rounded-xs bg-app-lavender-gray px-2 py-1"
						data-testid={`application-card-deadline-${application.id}`}
					>
						<IconHourglass className="size-4 rotate-180 text-black" />
						<p className="text-sm font-normal text-black">{application.deadline}</p>
					</div>
				)}

				<AppButton
					className="w-[97px] py-0.5"
					data-testid={`application-card-open-button-${application.id}`}
					onClick={() => onOpen(application.id, application.title)}
					variant="secondary"
				>
					Open
				</AppButton>
			</main>
		</div>
	);
}

function formatDate(dateString: string) {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	});
}
