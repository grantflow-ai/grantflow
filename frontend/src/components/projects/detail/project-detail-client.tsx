"use client";

import { Edit, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AvatarGroup } from "@/components/app";
import type { API } from "@/types/api-types";
import type { UserRole } from "@/types/user";
import { DeleteApplicationModal } from "../applications/delete-application-modal";

import { ProjectSidebar } from "./project-sidebar";

interface ProjectDetailClientProps {
	initialProject: API.GetProject.Http200.ResponseBody;
}

// Mock application data for demonstration
const mockApplications = [
	{
		deadline: "4 weeks and 3 days to the deadline",
		description:
			"Lorem ipsum dolor sit amet consectetur. Dictum pharetra mauris quis id velit. Nulla vulputate elit volutpat magnis non sapien potenti. Faucibus venenatis venenatis elit arcu mauris. Semper ut.",
		id: "1",
		lastEdited: "22.08.25",
		name: "Application Name",
		status: "generating" as const,
	},
	{
		deadline: "",
		description:
			"Lorem ipsum dolor sit amet consectetur. Dictum pharetra mauris quis id velit. Nulla vulputate elit volutpat magnis non sapien potenti. Faucibus venenatis venenatis elit arcu mauris. Semper ut.",
		id: "2",
		lastEdited: "22.08.25",
		name: "Application Name",
		status: "in_progress" as const,
	},
	{
		deadline: "4 weeks and 3 days to the deadline",
		description:
			"Lorem ipsum dolor sit amet consectetur. Dictum pharetra mauris quis id velit. Nulla vulputate elit volutpat magnis non sapien potenti. Faucibus venenatis venenatis elit arcu mauris. Semper ut.",
		id: "3",
		lastEdited: "22.08.25",
		name: "Application Name",
		status: "working_draft" as const,
	},
	{
		deadline: "4 weeks and 3 days to the deadline",
		description:
			"Lorem ipsum dolor sit amet consectetur. Dictum pharetra mauris quis id velit. Nulla vulputate elit volutpat magnis non sapien potenti. Faucibus venenatis venenatis elit arcu mauris. Semper ut.",
		id: "4",
		lastEdited: "22.08.25",
		name: "Application Name",
		status: "working_draft" as const,
	},
	{
		deadline: "4 weeks and 3 days to the deadline",
		description:
			"Lorem ipsum dolor sit amet consectetur. Dictum pharetra mauris quis id velit. Nulla vulputate elit volutpat magnis non sapien potenti. Faucibus venenatis venenatis elit arcu mauris. Semper ut.",
		id: "5",
		lastEdited: "22.08.25",
		name: "Application Name",
		status: "working_draft" as const,
	},
	{
		deadline: "4 weeks and 3 days to the deadline",
		description:
			"Lorem ipsum dolor sit amet consectetur. Dictum pharetra mauris quis id velit. Nulla vulputate elit volutpat magnis non sapien potenti. Faucibus venenatis venenatis elit arcu mauris. Semper ut.",
		id: "6",
		lastEdited: "22.08.25",
		name: "Application Name",
		status: "working_draft" as const,
	},
];

const statusConfig = {
	generating: {
		color: "bg-[#1e13f8]",
		label: "Generating",
		textColor: "text-white",
	},
	in_progress: {
		color: "bg-[#9747ff]",
		label: "In Progress",
		textColor: "text-white",
	},
	working_draft: {
		color: "bg-[#211968]",
		label: "Working Draft",
		textColor: "text-white",
	},
};

const applicationCardUser = { backgroundColor: "#369e94", initials: "NH" };
const applicationCardUsers = [applicationCardUser];

interface ApplicationCardProps {
	application: (typeof mockApplications)[0];
	onDelete: (id: string) => void;
}

function ApplicationCard({ application, onDelete }: ApplicationCardProps) {
	const status = statusConfig[application.status];
	const [showMenu, setShowMenu] = useState(false);

	return (
		<div className="relative flex flex-col gap-4 rounded-lg bg-white border border-[#e1dfeb] p-6">
			{/* Status Badge and Menu */}
			<div className="flex items-start justify-between">
				<div className={`flex items-center gap-2 rounded px-2 py-1 ${status.color}`}>
					<div className="size-2 rounded-full bg-white" />
					<span className={`font-['Source_Sans_Pro'] text-[12px] font-medium ${status.textColor}`}>
						{status.label}
					</span>
					<span className={`font-['Source_Sans_Pro'] text-[10px] ${status.textColor}`}>
						Last edited {application.lastEdited}
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

			{/* Avatar and Title */}
			<div className="flex items-center gap-3">
				<AvatarGroup maxVisible={1} size="sm" users={applicationCardUsers} />
				<h3 className="font-['Source_Sans_Pro'] font-semibold text-[16px] leading-[22px] text-[#2e2d36]">
					{application.name}
				</h3>
			</div>

			{/* Description */}
			<p className="font-['Source_Sans_Pro'] text-[14px] leading-[20px] text-[#636170]">
				{application.description}
			</p>

			{/* Deadline if exists */}
			{application.deadline && (
				<div className="flex items-center gap-2 text-[#636170]">
					<span className="text-[14px]">⏰</span>
					<span className="font-['Source_Sans_Pro'] text-[12px]">{application.deadline}</span>
				</div>
			)}

			{/* Open Button */}
			<button
				className="self-end rounded border border-[#1e13f8] bg-white px-4 py-2 font-['Source_Sans_Pro'] font-medium text-[14px] text-[#1e13f8] hover:bg-[#f6f5f9] transition-colors"
				type="button"
			>
				Open
			</button>
		</div>
	);
}

const teamMembers = [{ backgroundColor: "#369e94", initials: "NH" }];

export function ProjectDetailClient({ initialProject }: ProjectDetailClientProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [projectTitle, setProjectTitle] = useState(initialProject.name);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [applicationToDelete, setApplicationToDelete] = useState<null | string>(null);
	const [applications, setApplications] = useState(mockApplications);
	const titleInputRef = useRef<HTMLInputElement>(null);

	const filteredApplications = applications.filter(
		(app) =>
			app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			app.description.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleDeleteApplication = (applicationId: string) => {
		setApplicationToDelete(applicationId);
		setShowDeleteModal(true);
	};

	const confirmDeleteApplication = () => {
		if (applicationToDelete) {
			setApplications(applications.filter((app) => app.id !== applicationToDelete));
			setApplicationToDelete(null);
			setShowDeleteModal(false);
		}
	};

	useEffect(() => {
		if (isEditingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
		}
	}, [isEditingTitle]);

	return (
		<div className="flex h-screen bg-[#f6f5f9]">
			{/* Sidebar */}
			<ProjectSidebar
				applications={applications.map((app) => ({
					id: app.id,
					name: app.name,
					status: app.status,
				}))}
				projectId={initialProject.id}
				userRole={initialProject.role as UserRole}
			/>

			{/* Main Content */}
			<div className="flex-1 flex flex-col">
				{/* Top Bar */}
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

				{/* Search and New Application */}
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
					<Link
						className="flex items-center gap-2 rounded bg-[#1e13f8] px-4 py-2 font-['Source_Sans_Pro'] font-medium text-[14px] text-white hover:bg-[#1710d4] transition-colors ml-4"
						href={`/projects/${initialProject.id}/applications/new`}
					>
						<Plus className="size-4" />
						New Application
					</Link>
				</div>

				{/* Applications Grid or Empty State */}
				<div className="flex-1 overflow-auto px-6 pb-6">
					{filteredApplications.length > 0 ? (
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
							{filteredApplications.map((application) => (
								<ApplicationCard
									application={application}
									key={application.id}
									onDelete={handleDeleteApplication}
								/>
							))}
						</div>
					) : (
						<div className="flex items-center justify-center h-full">
							<Link
								className="flex flex-col items-center justify-center w-[300px] h-[200px] bg-white rounded-lg border-2 border-dashed border-[#e1dfeb] hover:border-[#1e13f8] transition-colors cursor-pointer"
								href={`/projects/${initialProject.id}/applications/new`}
							>
								<div className="flex items-center justify-center size-12 mb-3">
									<Plus className="size-8 text-[#1e13f8]" />
								</div>
								<span className="font-['Source_Sans_Pro'] text-[16px] text-[#636170]">
									{searchQuery ? "No applications found" : "New Application"}
								</span>
							</Link>
						</div>
					)}
				</div>
			</div>

			{/* Delete Application Modal */}
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