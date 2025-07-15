"use client";

import { PencilIcon, Plus, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { createApplication, deleteApplication, listApplications } from "@/actions/grant-applications";
import { getProjectMembers } from "@/actions/project";
import { AppHeader } from "@/components/layout/app-header";
import { DEFAULT_APPLICATION_TITLE } from "@/constants";
import { useNavigationStore } from "@/stores/navigation-store";
import { useProjectStore } from "@/stores/project-store";
import { log } from "@/utils/logger";
import { routes } from "@/utils/navigation";
import { generateBackgroundColor, generateInitials } from "@/utils/user";
import { DeleteApplicationModal } from "../applications/delete-application-modal";
import { ApplicationList } from "./application-list";

export function ProjectDetailClient() {
	const router = useRouter();
	const { project } = useProjectStore();
	const { navigateToApplication } = useNavigationStore();
	const [searchQuery, setSearchQuery] = useState("");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [projectTitle, setProjectTitle] = useState(project?.name ?? "");
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [applicationToDelete, setApplicationToDelete] = useState<null | string>(null);
	const [isCreatingApplication, setIsCreatingApplication] = useState(false);
	const titleInputRef = useRef<HTMLInputElement>(null);

	// Focus title input when editing
	useEffect(() => {
		if (isEditingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
		}
	}, [isEditingTitle]);

	// Redirect if no project
	useEffect(() => {
		if (!project) {
			router.replace(routes.projects());
		}
	}, [project, router]);

	// Update title when project changes
	useEffect(() => {
		if (project?.name) {
			setProjectTitle(project.name);
		}
	}, [project?.name]);

	// Fetch applications using SWR
	const { data: applicationsData, isLoading } = useSWR(
		project ? `/projects/${project.id}/applications?search=${searchQuery}` : null,
		() => (project ? listApplications(project.id, { search: searchQuery || undefined }) : null),
		{
			revalidateOnFocus: false,
		},
	);

	// Fetch project members using SWR
	const { data: projectMembers } = useSWR(
		project ? `/projects/${project.id}/members` : null,
		() => (project ? getProjectMembers(project.id) : null),
		{
			revalidateOnFocus: false,
		},
	);

	const applications = applicationsData?.applications ?? [];

	// Generate team members from project members (same logic as dashboard)
	const projectTeamMembers =
		projectMembers?.reduce<{ backgroundColor: string; imageUrl?: string; initials: string; uid: string }[]>(
			(acc, member) => {
				// Avoid duplicates by checking if user already exists (by firebase_uid)
				const existingMember = acc.find((existing) => existing.uid === member.firebase_uid);
				if (!existingMember) {
					acc.push({
						backgroundColor: generateBackgroundColor(member.firebase_uid),
						initials: generateInitials(member.display_name ?? undefined, member.email),
						uid: member.firebase_uid,
						...(member.photo_url && { imageUrl: member.photo_url }),
					});
				}
				return acc;
			},
			[],
		) ?? [];

	const handleDeleteApplication = (applicationId: string) => {
		setApplicationToDelete(applicationId);
		setShowDeleteModal(true);
	};

	const confirmDeleteApplication = async () => {
		if (applicationToDelete && project) {
			try {
				await deleteApplication(project.id, applicationToDelete);
				await mutate(`/projects/${project.id}/applications`);
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
		if (!project) return;
		setIsCreatingApplication(true);
		try {
			const application = await createApplication(project.id, { title: DEFAULT_APPLICATION_TITLE });
			await mutate(`/projects/${project.id}/applications`);
			// Set navigation context
			navigateToApplication(
				project.id,
				project.name,
				application.id,
				application.title || DEFAULT_APPLICATION_TITLE,
			);
			const wizardPath = routes.application.wizard();
			router.push(wizardPath);
		} catch (error) {
			log.error("create-application-button", error);
			toast.error("Failed to create application");
			setIsCreatingApplication(false);
		}
	};

	const handleOpenApplication = (applicationId: string, applicationTitle: string) => {
		if (!project) return;
		// Set navigation context
		navigateToApplication(project.id, project.name, applicationId, applicationTitle);
		const wizardPath = routes.application.wizard();
		router.push(wizardPath);
	};

	if (!project) {
		return null; // Will redirect via useEffect
	}

	return (
		<section className="w-full h-full overflow-y-scroll flex flex-col">
			<AppHeader projectTeamMembers={projectTeamMembers} />

			<main className="flex-1 flex flex-col">
				<main className="flex flex-col pt-6 pb-8 px-10 flex-1 min-h-0" data-testid="project-header">
					{/* Inline header content matching Figma design */}
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-2">
							{isEditingTitle ? (
								<input
									className="font-medium text-[36px] leading-[42px] text-app-black bg-app-gray-100 outline-none rounded-md px-2 min-w-[200px]"
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
								<h1 className="font-medium text-[36px] leading-[42px] text-app-black">
									{projectTitle}
								</h1>
							)}
							{!isEditingTitle && (
								<button
									className="flex size-6 items-center justify-center text-app-gray-600 hover:text-app-black cursor-pointer"
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
							<div className="relative w-80">
								<SearchIcon className="absolute right-3 top-1/2 size-3 -translate-y-1/2 text-app-gray-600" />
								<input
									className="w-full h-10 rounded-[4px] px-3 border border-app-gray-400 bg-white text-base text-app-black placeholder:text-app-gray-500 placeholder:font-normal outline-none focus:border-primary"
									onChange={(e) => {
										setSearchQuery(e.target.value);
									}}
									placeholder="Search by application name or content"
									value={searchQuery}
								/>
							</div>

							<button
								className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-base inline-flex items-center gap-2 transition-all disabled:pointer-events-none disabled:opacity-50"
								data-testid="new-application-button"
								disabled={isCreatingApplication}
								onClick={handleCreateApplication}
								type="button"
							>
								<Plus className="size-4" />
								<span>New Application</span>
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-auto pb-6 min-h-0" data-testid="applications-section">
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
