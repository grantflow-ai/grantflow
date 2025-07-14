"use client";

import { PencilIcon, Plus, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

import { ApplicationList } from "./application-list";
import { DashboardHeader } from "../dashboard/dashboard-header";
import { DeleteApplicationModal } from "../applications/delete-application-modal";
import { log } from "@/utils/logger";
import { routes } from "@/utils/navigation";
import type { API } from "@/types/api-types";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { AppButton } from "@/components/app";
import { createApplication, deleteApplication, listApplications } from "@/actions/grant-applications";



interface ProjectDetailClientProps {
	initialProject: API.GetProject.Http200.ResponseBody;
}

const projectTeamMembers = [
	{ backgroundColor: "#369e94", initials: "NH" },
	{ backgroundColor: "#9e366f", initials: "VH" },
	{ backgroundColor: "#9747ff", initials: "AR" },
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
		<section className="bg-preview-bg w-full h-full overflow-y-scroll  flex">
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
						<ApplicationList
							applications={applications}
							isCreatingApplication={isCreatingApplication}
							isLoading={isLoading}
							onCreate={handleCreateApplication}
							onDelete={handleDeleteApplication}
							onOpen={handleOpenApplication}
							searchQuery={searchQuery}
						/>
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
