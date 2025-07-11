"use client";

import { PencilIcon, Plus, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

import { createApplication, deleteApplication, listApplications } from "@/actions/grant-applications";
import { AppButton } from "@/components/app";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";
import { routes } from "@/utils/navigation";
import { DeleteApplicationModal } from "../applications/delete-application-modal";
import { DashboardHeader } from "../dashboard/dashboard-header";
import { ApplicationCard } from "./application-card";

interface ProjectDetailClientProps {
	initialProject: API.GetProject.Http200.ResponseBody;
}

const projectTeamMembers = [
	{ backgroundColor: "#369e94", initials: "NH" },
	{ backgroundColor: "#9e366f", initials: "VH" },
	{ backgroundColor: "#9747ff", initials: "AR" },
];

const mockApplications = [
	{
		completed_at: null,
		created_at: "2023-10-20T09:00:00Z",
		deadline: "6 weeks and 5 days to the deadline",
		description:
			"A grant to support local artists and cultural events. This funding aims to foster creativity and community engagement through public art installations, workshops, and performances.",
		id: "1",
		project_id: "proj-1",
		schema_id: "schema-1",
		status: "Generating",
		title: "Community Arts Grant",
		updated_at: "2023-10-26T10:00:00Z",
		user_id: "user-1",
	},
	{
		completed_at: null,
		created_at: "2023-10-22T11:00:00Z",
		deadline: "4 weeks and 2 days to the deadline",
		description:
			"Funding for educational programs targeting underprivileged youth. The initiative focuses on providing access to quality education, mentorship, and resources to help young people achieve their full potential.",
		id: "2",
		project_id: "proj-1",
		schema_id: "schema-2",
		status: "In Progress",
		title: "Youth Education Initiative",
		updated_at: "2023-10-25T14:30:00Z",
		user_id: "user-1",
	},
	{
		completed_at: "2023-09-20T12:00:00Z",
		created_at: "2023-09-01T08:00:00Z",
		deadline: "2 weeks and 1 day to the deadline",
		description:
			"A fund for projects focused on environmental protection. We support initiatives related to conservation, sustainability, and raising awareness about critical environmental issues.",
		id: "3",
		project_id: "proj-1",
		schema_id: "schema-3",
		status: "Working Draft",
		title: "Environmental Conservation Fund",
		updated_at: "2023-09-15T18:45:00Z",
		user_id: "user-1",
	},
	{
		completed_at: null,
		created_at: "2023-10-21T10:00:00Z",
		deadline: "8 weeks and 3 days to the deadline",
		description:
			"Supporting innovative technology solutions for social problems. This grant is for developers, entrepreneurs, and organizations using technology to create a positive impact on society.",
		id: "4",
		project_id: "proj-1",
		schema_id: "schema-4",
		status: "In Progress",
		title: "Tech for Good Grant",
		updated_at: "2023-10-27T11:00:00Z",
		user_id: "user-1",
	},
];

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

	const applications = mockApplications;

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
			const wizardPath = routes.application.wizard({
				applicationId: application.id,
				applicationTitle: application.title || DEFAULT_APPLICATION_TITLE,
				projectId: initialProject.id,
				projectName: initialProject.name,
			});
			router.push(wizardPath);
		} catch (error) {
			log.error("create-application-button", error);
			toast.error("Failed to create application");
			setIsCreatingApplication(false);
		}
	};

	const handleOpenApplication = (applicationId: string, applicationTitle: string) => {
		const wizardPath = routes.application.wizard({
			applicationId,
			applicationTitle,
			projectId: initialProject.id,
			projectName: initialProject.name,
		});
		router.push(wizardPath);
	};

	useEffect(() => {
		if (isEditingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
		}
	}, [isEditingTitle]);

	return (
		<section className="bg-preview-bg w-full h-full  flex">
			<main className="w-[98%] pb-5">
				<DashboardHeader data-testid="dashboard-header" projectTeamMembers={projectTeamMembers} />
				<main
					className=" px-10 relative flex h-[863px] flex-col gap-10 pt-14 pb-8 rounded-lg bg-white border border-gray-200"
					data-testid="project-header"
				>
					<div className="flex items-center justify-between w-full">
						<div className="flex items-center gap-2">
							{isEditingTitle ? (
								<input
									className="font-medium text-[36px] leading-[42px] text-black bg-gray-100 outline-none rounded-md px-2 w-full min-w-[100px]"
									data-testid="project-title-input"
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
								<h1
									className=" font-medium text-[36px] leading-[42px] text-black"
									data-testid="project-title"
								>
									{projectTitle}
								</h1>
							)}
							{!isEditingTitle && (
								<button
									className="flex size-6 items-center justify-center text-[#636170] hover:text-[#2e2d36] cursor-pointer"
									data-testid="edit-project-title-button"
									onClick={() => {
										setIsEditingTitle(true);
									}}
									type="button"
								>
									<PencilIcon className="size-3" />
								</button>
							)}
						</div>
						<div className="flex items-center gap-3">
							<div className="relative w-80 ">
								<SearchIcon className="absolute right-3 top-1/2 size-3 -translate-y-1/2 text-[#636170]" />
								<input
									className="w-full h-10 rounded-[4px] px-3 border border-[#e1dfeb] bg-white   text-[14px] text-base text-black placeholder:text-gray-400 placeholder:font-normal placeholder:text-sm outline-none focus:border-[#1e13f8]"
									data-testid="application-search-input"
									onChange={(e) => {
										setSearchQuery(e.target.value);
									}}
									placeholder="Search by application name or content"
									value={searchQuery}
								/>
							</div>
							<AppButton
								className="px-4 py-2"
								data-testid="new-application-button"
								disabled={isCreatingApplication}
								onClick={handleCreateApplication}
								type="button"
								variant="primary"
							>
								<Plus className="size-4" />
								<p className="font-normal text-base">New Application</p>
							</AppButton>
						</div>
					</div>
					<div className="flex-1 overflow-auto  pb-6" data-testid="applications-section">
						{isLoading && (
							<div className="flex items-center justify-center h-64">
								<div className="text-[#636170]">Loading applications...</div>
							</div>
						)}
						{!isLoading && applications.length > 0 && (
							<main className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-auto scrollbar-hide auto-rows-min max-h-full">
								{applications.map((application) => (
									<ApplicationCard
										application={application}
										key={application.id}
										onDelete={handleDeleteApplication}
										onOpen={handleOpenApplication}
									/>
								))}
							</main>
						)}
						{!isLoading && applications.length === 0 && (
							<div className=" w-[628px] h-[206px]" data-testid="empty-applications-state">
								<button
									className="flex flex-col items-center gap-2 justify-center w-full h-full bg-preview-bg rounded-[4px] border border-dashed border-gray-200 cursor-pointer"
									data-testid="empty-state-new-application-button"
									disabled={isCreatingApplication}
									onClick={handleCreateApplication}
									type="button"
								>
									<div className="flex items-center justify-center size-10">
										<Plus className="size-6 text-primary" />
									</div>
									<span className="text-base font-normal text-black">
										{getEmptyStateButtonText()}
									</span>
								</button>
							</div>
						)}
					</div>
				</main>
			</main>

			{}
			<DeleteApplicationModal
				isOpen={showDeleteModal}
				onClose={() => {
					setShowDeleteModal(false);
					setApplicationToDelete(null);
				}}
				onConfirm={confirmDeleteApplication}
			/>
		</section>
	);
}
