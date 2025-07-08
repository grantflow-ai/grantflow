"use client";

import { Edit, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { createApplication, deleteApplication, listApplications } from "@/actions/grant-applications";
import { AvatarGroup } from "@/components/app";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { PagePath } from "@/enums";
import type { API } from "@/types/api-types";
import type { UserRole } from "@/types/user";
import { log } from "@/utils/logger";
import { DeleteApplicationModal } from "../applications/delete-application-modal";

import { ProjectSidebar } from "./project-sidebar";

interface ProjectDetailClientProps {
	initialProject: API.GetProject.Http200.ResponseBody;
}

const statusConfig = {
	COMPLETED: {
		color: "bg-[#1e13f8]",
		label: "Completed",
		textColor: "text-white",
	},
	DRAFT: {
		color: "bg-[#211968]",
		label: "Draft",
		textColor: "text-white",
	},
	IN_PROGRESS: {
		color: "bg-[#9747ff]",
		label: "In Progress",
		textColor: "text-white",
	},
};

const applicationCardUser = { backgroundColor: "#369e94", initials: "NH" };
const applicationCardUsers = [applicationCardUser];

interface ApplicationCardProps {
	application: API.ListApplications.Http200.ResponseBody["applications"][0];
	onDelete: (id: string) => void;
	onOpen: (applicationId: string) => void;
}

function ApplicationCard({ application, onDelete, onOpen }: ApplicationCardProps) {
	const status = statusConfig[application.status as keyof typeof statusConfig];
	const [showMenu, setShowMenu] = useState(false);

	return (
		<div className="relative flex flex-col gap-4 rounded-lg bg-white border border-[#e1dfeb] p-6">
			{}
			<div className="flex items-start justify-between">
				<div className={`flex items-center gap-2 rounded px-2 py-1 ${status.color}`}>
					<div className="size-2 rounded-full bg-white" />
					<span className={`font-['Source_Sans_Pro'] text-[12px] font-medium ${status.textColor}`}>
						{status.label}
					</span>
					<span className={`font-['Source_Sans_Pro'] text-[10px] ${status.textColor}`}>
						Last edited {formatDate(application.updated_at)}
					</span>
				</div>
				<div className="relative">
					<button
						className="flex size-6 items-center justify-center text-[#636170] hover:text-[#2e2d36]"
						onBlur={() =>
							setTimeout(() => {
								setShowMenu(false);
							}, 200)
						}
						onClick={() => {
							setShowMenu(!showMenu);
						}}
						type="button"
					>
						<MoreVertical className="size-4" />
					</button>
					{showMenu && (
						<div className="absolute right-0 top-8 bg-white border border-[#e1dfeb] rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
							<button
								className="flex items-center gap-2 w-full px-3 py-2 text-left font-['Source_Sans_Pro'] text-[14px] text-[#d32f2f] hover:bg-[#faf9fb] transition-colors"
								onClick={() => {
									onDelete(application.id);
									setShowMenu(false);
								}}
								type="button"
							>
								<Trash2 className="size-4" />
								Delete
							</button>
						</div>
					)}
				</div>
			</div>

			{}
			<div className="flex items-center gap-3">
				<AvatarGroup maxVisible={1} size="sm" users={applicationCardUsers} />
				<h3 className="font-['Source_Sans_Pro'] font-semibold text-[16px] leading-[22px] text-[#2e2d36]">
					{application.title}
				</h3>
			</div>

			{}
			<p className="font-['Source_Sans_Pro'] text-[14px] leading-[20px] text-[#636170]">
				Grant application for {application.title}
			</p>

			{}

			{}
			<button
				className="self-end rounded border border-[#1e13f8] bg-white px-4 py-2 font-['Source_Sans_Pro'] font-medium text-[14px] text-[#1e13f8] hover:bg-[#f6f5f9] transition-colors cursor-pointer"
				onClick={() => {
					onOpen(application.id);
				}}
				type="button"
			>
				Open
			</button>
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

const teamMembers = [{ backgroundColor: "#369e94", initials: "NH" }];

export function ProjectDetailClient({ initialProject }: ProjectDetailClientProps) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [projectTitle, setProjectTitle] = useState(initialProject.name);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [applicationToDelete, setApplicationToDelete] = useState<null | string>(null);
	const [isCreatingApplication, setIsCreatingApplication] = useState(false);
	const titleInputRef = useRef<HTMLInputElement>(null);

	// Fetch applications using SWR
	const { data: applicationsData, isLoading } = useSWR(
		`/projects/${initialProject.id}/applications?search=${searchQuery}`,
		() => listApplications(initialProject.id, { search: searchQuery || undefined }),
		{
			revalidateOnFocus: false,
		},
	);

	const applications = applicationsData?.applications ?? [];

	const handleDeleteApplication = (applicationId: string) => {
		setApplicationToDelete(applicationId);
		setShowDeleteModal(true);
	};

	const confirmDeleteApplication = async () => {
		if (applicationToDelete) {
			try {
				await deleteApplication(initialProject.id, applicationToDelete);
				await mutate(`/projects/${initialProject.id}/applications`);
				toast.success("Application deleted successfully");
				setApplicationToDelete(null);
				setShowDeleteModal(false);
			} catch (error) {
				log.error("delete-application", error);
				toast.error("Failed to delete application");
			}
		}
	};

	const getEmptyStateButtonText = () => {
		if (searchQuery) return "No applications found";
		if (isCreatingApplication) return "Creating...";
		return "New Application";
	};

	const handleCreateApplication = async () => {
		setIsCreatingApplication(true);
		try {
			const application = await createApplication(initialProject.id, { title: DEFAULT_APPLICATION_TITLE });
			await mutate(`/projects/${initialProject.id}/applications`);
			const wizardPath = PagePath.APPLICATION_WIZARD.replace(":projectId", initialProject.id).replace(
				":applicationId",
				application.id,
			);
			router.push(wizardPath);
		} catch (error) {
			log.error("create-application-button", error);
			toast.error("Failed to create application");
			setIsCreatingApplication(false);
		}
	};

	const handleOpenApplication = (applicationId: string) => {
		const wizardPath = PagePath.APPLICATION_WIZARD.replace(":projectId", initialProject.id).replace(
			":applicationId",
			applicationId,
		);
		router.push(wizardPath);
	};

	useEffect(() => {
		if (isEditingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
		}
	}, [isEditingTitle]);

	return (
		<div className="flex h-screen bg-[#f6f5f9]">
			{}
			<ProjectSidebar
				applications={applications.map((app) => ({
					id: app.id,
					name: app.title,
					status: app.status,
				}))}
				isCreatingApplication={isCreatingApplication}
				onCreateApplication={handleCreateApplication}
				projectId={initialProject.id}
				userRole={initialProject.role as UserRole}
			/>

			{}
			<div className="flex-1 flex flex-col">
				{}
				<div className="flex items-center justify-between bg-white px-6 py-4 border-b border-[#e1dfeb]">
					<div className="flex items-center gap-3">
						<button className="text-[#636170] hover:text-[#2e2d36]" type="button">
							←
						</button>
						<div className="flex items-center gap-2">
							{isEditingTitle ? (
								<input
									className="font-['Cabin'] font-medium text-[24px] leading-[30px] text-[#2e2d36] bg-transparent border-b border-[#1e13f8] outline-none"
									onBlur={() => {
										setIsEditingTitle(false);
									}}
									onChange={(e) => {
										setProjectTitle(e.target.value);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											setIsEditingTitle(false);
										}
									}}
									ref={titleInputRef}
									value={projectTitle}
								/>
							) : (
								<h1 className="font-['Cabin'] font-medium text-[24px] leading-[30px] text-[#2e2d36]">
									{projectTitle}
								</h1>
							)}
							<button
								className="flex size-6 items-center justify-center text-[#636170] hover:text-[#2e2d36]"
								onClick={() => {
									setIsEditingTitle(true);
								}}
								type="button"
							>
								<Edit className="size-4" />
							</button>
						</div>
					</div>
					<AvatarGroup size="md" users={teamMembers} />
				</div>

				{}
				<div className="flex items-center justify-between px-6 py-4">
					<div className="relative flex-1 max-w-2xl">
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#636170]" />
						<input
							className="w-full rounded-lg border border-[#e1dfeb] bg-white py-2 pl-10 pr-4 font-['Source_Sans_Pro'] text-[14px] placeholder-[#636170] outline-none focus:border-[#1e13f8]"
							onChange={(e) => {
								setSearchQuery(e.target.value);
							}}
							placeholder="Search by application name or content"
							value={searchQuery}
						/>
					</div>
					<button
						className="flex items-center gap-2 rounded bg-[#1e13f8] px-4 py-2 font-['Source_Sans_Pro'] font-medium text-[14px] text-white hover:bg-[#1710d4] transition-colors ml-4"
						disabled={isCreatingApplication}
						onClick={handleCreateApplication}
						type="button"
					>
						<Plus className="size-4" />
						{isCreatingApplication ? "Creating..." : "New Application"}
					</button>
				</div>

				{}
				<div className="flex-1 overflow-auto px-6 pb-6">
					{isLoading && (
						<div className="flex items-center justify-center h-64">
							<div className="text-[#636170]">Loading applications...</div>
						</div>
					)}
					{!isLoading && applications.length > 0 && (
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
							{applications.map((application) => (
								<ApplicationCard
									application={application}
									key={application.id}
									onDelete={handleDeleteApplication}
									onOpen={handleOpenApplication}
								/>
							))}
						</div>
					)}
					{!isLoading && applications.length === 0 && (
						<div className="flex items-center justify-center h-full">
							<button
								className="flex flex-col items-center justify-center w-[300px] h-[200px] bg-white rounded-lg border-2 border-dashed border-[#e1dfeb] hover:border-[#1e13f8] transition-colors cursor-pointer"
								disabled={isCreatingApplication}
								onClick={handleCreateApplication}
								type="button"
							>
								<div className="flex items-center justify-center size-12 mb-3">
									<Plus className="size-8 text-[#1e13f8]" />
								</div>
								<span className="font-['Source_Sans_Pro'] text-[16px] text-[#636170]">
									{getEmptyStateButtonText()}
								</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{}
			<DeleteApplicationModal
				isOpen={showDeleteModal}
				onClose={() => {
					setShowDeleteModal(false);
					setApplicationToDelete(null);
				}}
				onConfirm={confirmDeleteApplication}
			/>
		</div>
	);
}
